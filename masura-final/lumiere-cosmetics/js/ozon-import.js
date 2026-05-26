/**
 * LUMIÈRE — Ozon Import Module
 */

import { addProduct, updateProduct, getProducts } from './db.js';

const PROXY = '/.netlify/functions/ozon-proxy';

export function initOzonImport() {
  const nav = document.querySelector('.sidebar__nav');
  const menuItem = document.createElement('div');
  menuItem.className = 'sidebar__item';
  menuItem.dataset.section = 'import';
  menuItem.innerHTML = `
    <svg viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
    Импорт из Ozon
  `;
  nav.appendChild(menuItem);

  menuItem.addEventListener('click', () => {
    document.querySelectorAll('.sidebar__item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    menuItem.classList.add('active');
    document.getElementById('section-import').classList.add('active');
  });

  const main = document.querySelector('.admin-main');
  const section = document.createElement('section');
  section.className = 'admin-section';
  section.id = 'section-import';
  section.innerHTML = `
    <h1 class="admin-page-title">Импорт из Ozon</h1>
    <p class="admin-page-sub">Загрузи товары прямо из своего магазина на Ozon Seller</p>

    <div class="settings-card">
      <h2 class="settings-card__title">API ключи Ozon</h2>
      <p style="font-size:12px;color:#8A6A50;margin-bottom:16px">
        Найти: <a href="https://seller.ozon.ru/app/settings/api-keys" target="_blank" style="color:#2C1A0E">
        Ozon Seller → Настройки → API ключи</a>
      </p>
      <div class="form-row">
        <div class="form-group">
          <label>Client ID</label>
          <input type="text" id="ozon-client-id" placeholder="123456" autocomplete="off">
        </div>
        <div class="form-group">
          <label>API Key</label>
          <input type="password" id="ozon-api-key" placeholder="••••••••-••••-••••-••••-••••••••••••" autocomplete="off">
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:center;margin-top:4px">
        <button class="btn btn-outline" id="ozon-test-btn">Проверить подключение</button>
        <span id="ozon-connection-status" style="font-size:13px"></span>
      </div>
    </div>

    <div class="settings-card">
      <h2 class="settings-card__title">Параметры импорта</h2>
      <div class="toggle-row">
        <label for="ozon-update">Обновлять существующие товары</label>
        <label class="toggle"><input type="checkbox" id="ozon-update" checked><span class="toggle__slider"></span></label>
      </div>
      <div class="toggle-row">
        <label for="ozon-only-active">Только активные товары</label>
        <label class="toggle"><input type="checkbox" id="ozon-only-active" checked><span class="toggle__slider"></span></label>
      </div>
      <p style="font-size:12px;color:#8A6A50;margin-top:16px;margin-bottom:16px">
        Категории назначаются вручную после импорта в разделе Товары.
      </p>
      <button class="btn btn-accent" id="ozon-start-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
        Начать импорт
      </button>
    </div>

    <div class="settings-card" id="ozon-progress-card" style="display:none">
      <h2 class="settings-card__title">Прогресс импорта</h2>
      <div id="ozon-log" style="font-size:13px;line-height:2;color:#5C3D24;max-height:320px;overflow-y:auto;font-family:monospace"></div>
      <div style="margin-top:16px;background:#F0E8DD;border-radius:8px;height:6px;overflow:hidden">
        <div id="ozon-progress-bar" style="height:100%;background:#2C1A0E;width:0%;transition:width 0.4s"></div>
      </div>
      <p id="ozon-progress-text" style="font-size:12px;color:#8A6A50;margin-top:8px"></p>
    </div>
  `;
  main.appendChild(section);

  document.getElementById('ozon-test-btn').addEventListener('click', testOzonConnection);
  document.getElementById('ozon-start-btn').addEventListener('click', startOzonImport);
}

async function testOzonConnection() {
  const status = document.getElementById('ozon-connection-status');
  status.textContent = 'Проверяю...';
  status.style.color = '#8A6A50';

  const creds = getOzonCreds();
  if (!creds) { status.textContent = '⚠ Заполни Client ID и API Key'; status.style.color = '#C97B6A'; return; }

  try {
    const data = await callOzon('products', null, creds);
    if (data.result) {
      const count = data.result.total || data.result.items?.length || 0;
      status.textContent = `✓ Подключено! Найдено товаров: ${count}`;
      status.style.color = '#0F6E56';
    } else {
      throw new Error(data.message || data.error || JSON.stringify(data));
    }
  } catch (e) {
    status.textContent = `✗ ${e.message}`;
    status.style.color = '#C97B6A';
  }
}

async function startOzonImport() {
  const creds = getOzonCreds();
  if (!creds) { ozonLog('⚠ Заполни Client ID и API Key', 'error'); return; }

  const doUpdate   = document.getElementById('ozon-update').checked;
  const onlyActive = document.getElementById('ozon-only-active').checked;

  document.getElementById('ozon-progress-card').style.display = 'block';
  document.getElementById('ozon-log').innerHTML = '';
  document.getElementById('ozon-start-btn').disabled = true;
  setOzonProgress(0, 'Начинаю...');

  try {
    ozonLog('📋 Получаю список товаров из Ozon...');
    const listData = await callOzon('products', null, creds);
    if (!listData.result?.items) throw new Error(listData.message || JSON.stringify(listData));

    let items = listData.result.items;
    ozonLog(`  Найдено: ${items.length} товаров`);
    if (items.length === 0) { ozonLog('⚠ Товары не найдены', 'error'); return; }

    ozonLog('📦 Загружаю детали товаров...');
    const existingProducts = await getProducts();
    let imported = 0;
    let updated  = 0;

    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const ids   = batch.map(p => p.product_id);

      const infoData = await callOzon('product-info', { ids }, creds);

      if (!infoData.items) {
        ozonLog(`  ⚠ Батч ${Math.floor(i/batchSize)+1}: ${infoData.message || infoData.error || JSON.stringify(infoData).slice(0,100)}`, "error");
        continue;
      }

      for (const p of infoData.items) {
        // primary_image — массив, берём первый элемент
        const imageUrl = Array.isArray(p.primary_image)
          ? p.primary_image[0]
          : (p.primary_image || p.images?.[0] || null);

        // Цена — строка в Ozon, конвертируем в число
        const price = parseFloat(p.price || p.old_price || 0);

        // Статус активности
        const isActive = p.statuses?.status_name === 'Продается' ||
                         p.statuses?.moderate_status === 'approved';

        const name = p.name || p.offer_id || 'Без названия';

        const productData = {
          name,
          description: p.description || '',
          price,
          category:    'all',
          image:       imageUrl,
          emoji:       '✦',
          badge:       null,
          active:      onlyActive ? isActive : true,
          ozonId:      String(p.id),
          ozonOfferId: p.offer_id || '',
        };

        const existing = existingProducts.find(e => e.ozonId === String(p.id));

        if (existing && doUpdate) {
          await updateProduct(existing.id, productData);
          updated++;
        } else if (!existing) {
          await addProduct(productData);
          imported++;
        }
      }

      const done = Math.min(i + batchSize, items.length);
      setOzonProgress(Math.round((done / items.length) * 100), `${done} из ${items.length}`);
      ozonLog(`  ✓ Батч ${Math.floor(i/batchSize)+1}: обработано ${batch.length} товаров`);
    }

    setOzonProgress(100, 'Готово');
    ozonLog(`✅ Импорт завершён!`, 'success');
    ozonLog(`   Добавлено новых: ${imported}`, 'success');
    if (updated > 0) ozonLog(`   Обновлено: ${updated}`, 'success');
    ozonLog(`💡 Зайди в раздел Товары и назначь категории.`);

  } catch (e) {
    ozonLog(`✗ Ошибка: ${e.message}`, 'error');
  } finally {
    document.getElementById('ozon-start-btn').disabled = false;
  }
}

function getOzonCreds() {
  const clientId = document.getElementById('ozon-client-id')?.value.trim();
  const apiKey   = document.getElementById('ozon-api-key')?.value.trim();
  if (!clientId || !apiKey) return null;
  return { clientId, apiKey };
}

async function callOzon(resource, extra, creds) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: creds.clientId,
      apiKey:   creds.apiKey,
      resource,
      ...extra,
    }),
  });
  return res.json();
}

function ozonLog(msg, type = 'info') {
  const el = document.getElementById('ozon-log');
  const colors = { info: '#2C1A0E', error: '#C97B6A', success: '#0F6E56' };
  el.innerHTML += `<div style="color:${colors[type]}">${msg}</div>`;
  el.scrollTop = el.scrollHeight;
}

function setOzonProgress(pct, text) {
  document.getElementById('ozon-progress-bar').style.width  = pct + '%';
  document.getElementById('ozon-progress-text').textContent = text;
}
