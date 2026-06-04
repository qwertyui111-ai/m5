/**
 * LUMIÈRE — Admin Panel Logic
 */

import { auth, db } from './firebase-config.js';
window._db = db;
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getProducts, getActiveProducts, addProduct, updateProduct, deleteProduct,
  getCategories, addCategory, updateCategory, deleteCategory,
  getSettings, saveSettings,
  getOrders, updateOrderStatus,
  seedDatabase
} from './db.js';

import { initOzonImport } from './ozon-import.js';

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, async user => {
  if (user) {
    // Check admin role
    try {
      // Wait for _db to be initialized
      let attempts = 0;
      while (!window._db && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
      if (!window._db) { console.warn('DB not ready'); }
      else {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const snap = await getDoc(doc(window._db, 'users', user.uid));
        if (!snap.exists() || snap.data().role !== 'admin') {
          await signOut(auth);
          showError('Нет доступа. Только администраторы могут войти.');
          return;
        }
      }
    } catch(e) {
      console.warn('Role check error:', e);
    }
    document.getElementById('login-screen').style.display  = 'none';
    document.getElementById('admin-app').style.display     = 'grid';
    setTimeout(() => { loadDashboard(30); loadDashboardLegacy(); }, 500);
    document.getElementById('admin-email-display').textContent = user.email;
    // Показываем мобильный хедер
    const mobileHeader = document.getElementById('mobile-header');
    if (mobileHeader) mobileHeader.style.display = '';
    initMobileMenu();
    // Показываем имя пользователя в сайдбаре (часть до @)
    const username = user.email.split('@')[0];
    const labelEl = document.getElementById('sidebar-user-label');
    if (labelEl) labelEl.textContent = username;
    initAdmin();
  } else {
    document.getElementById('login-screen').style.display  = 'flex';
    document.getElementById('admin-app').style.display     = 'none';
  }
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errEl.textContent = 'Неверный email или пароль';
  }
});

document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// ============================================================
// NAVIGATION
// ============================================================

document.querySelectorAll('.sidebar__item').forEach(item => {
  item.addEventListener('click', () => {
    const section = item.dataset.section;
    document.querySelectorAll('.sidebar__item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('section-' + section)?.classList.add('active');
    loadSection(section);
  });
});

function loadSection(name) {
  if (name === 'dashboard')  loadDashboard();
  if (name === 'products')   loadProducts();
  if (name === 'categories') loadCategories();
  if (name === 'orders')     loadOrders();
  if (name === 'settings')   loadSettings();
}

// ============================================================
// INIT
// ============================================================

async function initAdmin() {
  await seedDatabase();
  initOzonImport();
  loadDashboard();
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboardLegacy() {
  try {
    const [products, categories, orders] = await Promise.all([
      getProducts(), getCategories(), getOrders()
    ]);
    const el = id => document.getElementById(id);
    if(el('stat-categories')) el('stat-categories').textContent = categories.length;
    if(el('stat-new-orders')) el('stat-new-orders').textContent = orders.filter(o => o.status === 'new').length;
    const tbody = document.getElementById('recent-orders-body');
    if (!tbody) return;
    const recent = orders.slice(0, 5);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state__icon">📭</div><p class="empty-state__text">Заказов пока нет</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = recent.map(o => `
      <tr>
        <td>#${o.id.slice(-6).toUpperCase()}</td>
        <td>${o.customerName || '—'}</td>
        <td>${formatPrice(o.total || 0)}</td>
        <td>${statusBadge(o.status)}</td>
        <td>${formatDate(o.createdAt)}</td>
      </tr>
    `).join('');
  } catch(e) { console.warn('Dashboard legacy error:', e); }
}

// ============================================================
// PRODUCTS
// ============================================================

window.allProducts = [];
window.allCategories = [];

async function loadProducts() {
  [window.allProducts, window.allCategories] = await Promise.all([getProducts(), getCategories()]);
  renderProductsTable(window.allProducts);
  bindProductSearch();
}

function renderProductsTable(products) {
  const tbody = document.getElementById('products-table-body');

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state__icon">📦</div><p class="empty-state__text">Товары не найдены</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr data-id="${p.id}">
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          ${p.favorite ? '<span title="Избранное" style="font-size:14px;filter:grayscale(1) brightness(0.2) sepia(1) hue-rotate(10deg)">⭐</span>' : ''}
          <span style="font-weight:400">${p.name}</span>
        </div>
      </td>
      <td>${getCatLabel(p.category)}</td>
      <td>${formatPrice(p.price)}</td>
      <td>${p.badge ? `<span class="badge ${p.badge === 'New' ? 'badge-new' : 'badge-hit'}">${p.badge}</span>` : '—'}</td>
      <td><span class="badge ${p.active ? 'badge-active' : 'badge-hidden'}">${p.active ? 'Активен' : 'Скрыт'}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-outline btn-sm btn-icon" title="Редактировать" onclick="openEditProduct('${p.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-danger btn-sm btn-icon" title="Удалить" onclick="confirmDeleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function bindProductSearch() {
  const input = document.getElementById('product-search');
  input.oninput = () => {
    const q = input.value.toLowerCase().trim();
    renderProductsTable(window.allProducts.filter(p => {
      if (!q) return true;
      // Получаем названия категорий по их ID
      const catLabels = (p.categories || [p.category]).filter(Boolean)
        .map(id => {
          const cat = (window.allCategories || []).find(c => c.id === id);
          return cat ? cat.label : id;
        });
      return [
        p.name,
        p.sku,
        p.description,
        p.color,
        p.effect,
        p.productType,
        ...(p.categories || []),
        p.category,
        ...catLabels
      ].some(v => (v || '').toLowerCase().includes(q));
    }));
  };
}

document.getElementById('add-product-btn').addEventListener('click', () => {
  document.getElementById('product-modal-title').textContent = 'Новый товар';
  document.getElementById('pm-id').value          = '';
  document.getElementById('pm-name').value        = '';
  document.getElementById('pm-description').value = '';
  document.getElementById('pm-price').value       = '';
  document.getElementById('pm-badge').value       = '';
  document.getElementById('pm-active').checked    = true;
  document.getElementById('pm-favorite').checked   = false;
  document.getElementById('pm-sku').value          = '';
  document.getElementById('pm-stock').value        = '';
  document.getElementById('pm-stock-min').value    = 5;
  renderGalleryList([]);
  document.getElementById('pm-color').value        = '';
  document.getElementById('pm-effect').value       = '';
  document.getElementById('pm-type').value         = '';
  document.getElementById('pm-ai-status').textContent = '';
  populateCategoryCheckboxes([]);
  bindAiTagsBtn();
  document.getElementById('pm-add-photo-btn').onclick = () => addGalleryRow('');
  openModal('product-modal');
});

window.openEditProduct = async (id) => {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('product-modal-title').textContent = 'Редактировать товар';
  document.getElementById('pm-id').value          = p.id;
  document.getElementById('pm-name').value        = p.name;
  document.getElementById('pm-description').value = p.description || '';
  document.getElementById('pm-price').value       = p.price;
  document.getElementById('pm-badge').value       = p.badge || '';
  document.getElementById('pm-active').checked    = p.active !== false;
  document.getElementById('pm-favorite').checked   = p.favorite === true;
  document.getElementById('pm-sku').value          = p.sku      || '';
  document.getElementById('pm-stock').value        = p.stock    ?? '';
  document.getElementById('pm-stock-min').value    = p.stockMin  ?? 5;
  renderGalleryList(p.gallery || []);
  document.getElementById('pm-color').value        = p.color  || '';
  document.getElementById('pm-effect').value       = p.effect || '';
  document.getElementById('pm-type').value         = p.productType || '';
  populateCategoryCheckboxes(Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : []));
  bindAiTagsBtn();
  document.getElementById('pm-add-photo-btn').onclick = () => addGalleryRow('');
  openModal('product-modal');
};

window.confirmDeleteProduct = async (id, name) => {
  if (!confirm(`Удалить товар «${name}»?`)) return;
  await deleteProduct(id);
  toast('Товар удалён');
  loadProducts();
};

document.getElementById('save-product-btn').addEventListener('click', async () => {
  const id    = document.getElementById('pm-id').value;
  const name  = document.getElementById('pm-name').value.trim();
  const price = parseFloat(document.getElementById('pm-price').value);

  if (!name || isNaN(price)) { toast('Заполните название и цену'); return; }

  const data = {
    name,
    categories:  getSelectedCategories(),
    category:    getSelectedCategories()[0] || 'all',
    description: document.getElementById('pm-description').value.trim(),
    price,
    badge:       document.getElementById('pm-badge').value || null,
    active:      document.getElementById('pm-active').checked,
    favorite:    document.getElementById('pm-favorite').checked,
    sku:         document.getElementById('pm-sku').value.trim(),
    stock:       parseInt(document.getElementById('pm-stock').value) || 0,
    stockMin:    parseInt(document.getElementById('pm-stock-min').value) || 5,
    gallery:     getGalleryUrls(),
    color:       document.getElementById('pm-color').value.trim(),
    effect:      document.getElementById('pm-effect').value.trim(),
    productType: document.getElementById('pm-type').value.trim(),
  };

  if (id) {
    await updateProduct(id, data);
    toast('Товар обновлён ✓');
    ['masura_cache_products','masura_cache_categories','masura_cache_settings'].forEach(k => localStorage.removeItem(k));
  } else {
    await addProduct(data);
    toast('Товар добавлен ✓');
  }

  closeModal('product-modal');
  loadProducts();
});

// ============================================================
// CATEGORIES
// ============================================================

async function loadCategories() {
  allCategories = await getCategories();
  const tbody = document.getElementById('categories-table-body');

  if (allCategories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><p>Категорий нет</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = allCategories.map(c => `
    <tr>
      <td style="font-weight:400">${c.label}</td>
      <td><code style="font-size:12px;background:#F0E8DD;padding:2px 8px;border-radius:4px">${c.id}</code></td>
      <td>${c.order}</td>
      <td>
        <div class="actions">
          <button class="btn btn-outline btn-sm btn-icon" onclick="openEditCategory('${c.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDeleteCategory('${c.id}', '${c.label}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('add-category-btn').addEventListener('click', () => {
  document.getElementById('category-modal-title').textContent = 'Новая категория';
  document.getElementById('cm-id').value    = '';
  document.getElementById('cm-label').value = '';
  document.getElementById('cm-slug').value  = '';
  document.getElementById('cm-order').value = allCategories.length + 1;
  openModal('category-modal');
});

window.openEditCategory = (id) => {
  const c = allCategories.find(x => x.id === id);
  if (!c) return;
  document.getElementById('category-modal-title').textContent = 'Редактировать категорию';
  document.getElementById('cm-id').value    = c.id;
  document.getElementById('cm-label').value = c.label;
  document.getElementById('cm-slug').value  = c.id;
  document.getElementById('cm-order').value = c.order;
  openModal('category-modal');
};

window.confirmDeleteCategory = async (id, label) => {
  if (!confirm(`Удалить категорию «${label}»?`)) return;
  await deleteCategory(id);
  toast('Категория удалена');
  loadCategories();
};

document.getElementById('save-category-btn').addEventListener('click', async () => {
  const existingId = document.getElementById('cm-id').value;
  const label = document.getElementById('cm-label').value.trim();
  const slug  = document.getElementById('cm-slug').value.trim().toLowerCase().replace(/\s+/g, '-');
  const order = parseInt(document.getElementById('cm-order').value) || 10;

  if (!label || !slug) { toast('Заполните название и ID'); return; }

  if (existingId) {
    await updateCategory(existingId, { label, order });
    toast('Категория обновлена ✓');
    ['masura_cache_products','masura_cache_categories'].forEach(k => localStorage.removeItem(k));
  } else {
    await addCategory({ id: slug, label, order });
    toast('Категория добавлена ✓');
  }

  closeModal('category-modal');
  loadCategories();
});

// ============================================================
// ORDERS
// ============================================================

const STATUS_LABELS = {
  new:      'Новый',
  paid:     'Оплачен',
  shipped:  'Отправлен',
  done:     'Выполнен',
  canceled: 'Отменён',
};

async function loadOrders() {
  const orders = await getOrders();
  const tbody  = document.getElementById('orders-table-body');

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state__icon">📭</div><p class="empty-state__text">Заказов пока нет</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td style="font-weight:500">#${o.id.slice(-6).toUpperCase()}</td>
      <td>${o.customerName || '—'}<br><span style="font-size:11px;color:#8A6A50">${o.customerEmail || ''}</span></td>
      <td style="font-size:12px;max-width:160px">${(o.items || []).map(i => i.name).join(', ') || '—'}</td>
      <td>${formatPrice(o.total || 0)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-size:12px">${formatDate(o.createdAt)}</td>
      <td>
        <select class="search-input" style="width:120px;padding:5px 8px" onchange="changeOrderStatus('${o.id}', this.value)">
          ${Object.entries(STATUS_LABELS).map(([val, lbl]) =>
            `<option value="${val}" ${o.status === val ? 'selected' : ''}>${lbl}</option>`
          ).join('')}
        </select>
      </td>
    </tr>
  `).join('');
}

window.changeOrderStatus = async (id, status) => {
  await updateOrderStatus(id, status);
  toast('Статус обновлён ✓');
};

// ============================================================
// SETTINGS
// ============================================================

async function loadSettings() {
  const s = await getSettings();
  document.getElementById('s-logo-image').value      = s.logoImage      || '';
  document.getElementById('s-marquee-enabled').checked = s.marqueeEnabled !== false;
  document.getElementById('s-marquee').value          = (s.marqueeItems || []).join(', ');
  document.getElementById('s-marquee-bg').value      = s.marqueeBg    || '#111111';
  document.getElementById('s-marquee-color').value   = s.marqueeColor || '#ffffff';
  document.getElementById('s-banner1-enabled').checked = s.heroBanner1Enabled !== false;
  document.getElementById('s-banner1').value          = s.heroBanner1   || '';
  document.getElementById('s-banner2-enabled').checked = s.heroBanner2Enabled !== false;
  document.getElementById('s-banner2').value          = s.heroBanner2   || '';
  document.getElementById('s-footer-about').value     = s.footerAbout    || '';
  document.getElementById('s-footer-contacts').value  = s.footerContacts || '';
}

document.getElementById('save-settings-btn').addEventListener('click', async () => {
  const marqueeRaw = document.getElementById('s-marquee').value;
  await saveSettings({
    logoImage:    document.getElementById('s-logo-image').value.trim(),
    marqueeEnabled: document.getElementById('s-marquee-enabled').checked,
    marqueeItems: marqueeRaw.split(',').map(s => s.trim()).filter(Boolean),
    marqueeBg:    document.getElementById('s-marquee-bg').value,
    marqueeColor: document.getElementById('s-marquee-color').value,
    heroBanner1Enabled: document.getElementById('s-banner1-enabled').checked,
    heroBanner1:  document.getElementById('s-banner1').value.trim(),
    heroBanner2Enabled: document.getElementById('s-banner2-enabled').checked,
    heroBanner2:  document.getElementById('s-banner2').value.trim(),
    footerAbout:  document.getElementById('s-footer-about').value.trim(),
    footerHelp:   document.getElementById('s-footer-help').value.trim(),
    footerInfo:   document.getElementById('s-footer-info').value.trim(),
    footerContacts: document.getElementById('s-footer-contacts').value.trim(),
  });
  toast('Настройки сохранены ✓');
    localStorage.removeItem('masura_cache_settings');
});

// ============================================================
// MODAL HELPERS
// ============================================================

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ============================================================
// UTILS
// ============================================================


// ============================================================
// GALLERY
// ============================================================

function renderGalleryList(urls) {
  const list = document.getElementById('pm-gallery-list');
  if (!list) return;
  list.innerHTML = '';
  (urls || []).forEach((url, i) => addGalleryRow(url));
}

function addGalleryRow(url) {
  const list = document.getElementById('pm-gallery-list');
  if (!list) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;align-items:center';
  row.innerHTML = `
    <input type="text" value="${url || ''}" placeholder="https://...jpg"
      style="flex:1;border:1px solid #E5D5C5;border-radius:6px;padding:8px 12px;font-size:13px;outline:none"
      oninput="this.dataset.changed=1">
    <button type="button" onclick="this.closest('div').remove()"
      style="background:none;border:none;cursor:pointer;color:#C97B6A;font-size:18px;line-height:1;padding:4px">×</button>
  `;
  list.appendChild(row);
}

function getGalleryUrls() {
  return [...document.querySelectorAll('#pm-gallery-list input')]
    .map(i => i.value.trim())
    .filter(Boolean);
}

// ============================================================
// AI TAGS
// ============================================================

function bindAiTagsBtn() {
  const btn = document.getElementById('pm-ai-tags-btn');
  if (!btn) return;
  btn.onclick = async () => {
    const name = document.getElementById('pm-name').value.trim();
    if (!name) { document.getElementById('pm-ai-status').textContent = '⚠ Сначала введи название товара'; return; }

    const status = document.getElementById('pm-ai-status');
    status.textContent = '✦ Анализирую название...';
    btn.disabled = true;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Проанализируй название товара для магазина косметики и выдели характеристики.
Название: "${name}"

Ответь ТОЛЬКО в формате JSON (без markdown, без пояснений):
{"color":"цвет через запятую или пусто","effect":"эффект через запятую или пусто","productType":"тип товара или пусто"}

Примеры:
- "Лак для ногтей розовый с блёстками" → {"color":"розовый","effect":"блёстки","productType":"лак"}
- "Гель-лак голографический синий" → {"color":"синий","effect":"голографический","productType":"гель-лак"}
- "Топ-сушка матовый" → {"color":"","effect":"матовый","productType":"топ"}
- "Полировочная пудра" → {"color":"","effect":"","productType":"пудра"}`
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '{}';
      const tags = JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());

      if (tags.color)       document.getElementById('pm-color').value  = tags.color;
      if (tags.effect)      document.getElementById('pm-effect').value = tags.effect;
      if (tags.productType) document.getElementById('pm-type').value   = tags.productType;

      status.textContent = '✓ Характеристики предложены — проверь и исправь если нужно';
      status.style.color = '#0F6E56';
    } catch (e) {
      status.textContent = '✗ Не удалось получить теги: ' + e.message;
      status.style.color = '#C97B6A';
    } finally {
      btn.disabled = false;
    }
  };
}

function populateCategorySelect(selectId, currentValue) {
  // Legacy support - now uses checkboxes
  populateCategoryCheckboxes(currentValue ? [currentValue] : []);
}

function populateCategoryCheckboxes(currentValues = []) {
  const container = document.getElementById('pm-categories');
  if (!container) return;
  const vals = Array.isArray(currentValues) ? currentValues : [currentValues].filter(Boolean);
  container.innerHTML = allCategories.map(c => `
    <label style="display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;border:1px solid #E5D5C5;cursor:pointer;font-size:12px;background:${vals.includes(c.id) ? '#2C1A0E' : '#fff'};color:${vals.includes(c.id) ? '#fff' : '#2C1A0E'};transition:all 0.15s">
      <input type="checkbox" value="${c.id}" ${vals.includes(c.id) ? 'checked' : ''} style="display:none" onchange="this.closest('label').style.background=this.checked?'#2C1A0E':'#fff';this.closest('label').style.color=this.checked?'#fff':'#2C1A0E'">
      ${c.label}
    </label>
  `).join('');
}

function getSelectedCategories() {
  const container = document.getElementById('pm-categories');
  if (!container) return [];
  return [...container.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
}

function getCatLabel(id) {
  return allCategories.find(c => c.id === id)?.label || id;
}

function formatPrice(n) {
  return Number(n).toLocaleString('ru-RU') + ' ₽';
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusBadge(status) {
  const labels = { new: 'Новый', paid: 'Оплачен', shipped: 'Отправлен', done: 'Выполнен', canceled: 'Отменён' };
  return `<span class="order-status status-${status}">${labels[status] || status}</span>`;
}

function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}


// ============================================================
// МОБИЛЬНОЕ МЕНЮ
// ============================================================
function initMobileMenu() {
  const btn     = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!btn || !sidebar || !overlay) return;

  function openMenu() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeMenu() : openMenu();
  });

  overlay.addEventListener('click', closeMenu);

  // Закрываем меню при выборе пункта
  document.querySelectorAll('.sidebar__item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeMenu();
    });
  });
}

// ============================================================
// USERS
// ============================================================

window.loadUsers = async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  try {
    const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const _db = window._db;
    if (!_db) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">База данных не готова, попробуйте ещё раз</td></tr>'; return; }
    const snap = await getDocs(collection(_db, 'users'));
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:40px">Пользователей пока нет</td></tr>';
      return;
    }
    tbody.innerHTML = snap.docs.map(d => {
      const u = d.data();
      const date = u.createdAt?.toDate?.()?.toLocaleDateString('ru-RU') || '—';
      return `<tr>
        <td>${u.email || '—'}</td>
        <td>${u.name || '—'}</td>
        <td>
          <input type="number" min="0" max="100" value="${u.discount || 0}"
            style="width:60px;border:1px solid #E5D5C5;border-radius:4px;padding:4px 8px;font-size:13px"
            onchange="saveUserDiscount('${d.id}', this.value)">%
        </td>
        <td>${date}</td>
        <td><button class="btn btn-outline btn-sm" onclick="saveUserDiscount('${d.id}', this.closest('tr').querySelector('input').value)">Сохранить</button></td>
      </tr>`;
    }).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#c00;padding:20px">${e.message}</td></tr>`;
  }
}

window.saveUserDiscount = async function(uid, discount) {
  try {
    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await updateDoc(doc(window._db, 'users', uid), { discount: Number(discount) });
    showToast('Скидка сохранена');
  } catch(e) {
    showToast('Ошибка: ' + e.message);
  }
};

// ============================================================
// PROMOCODES
// ============================================================

window.loadPromocodes = async function loadPromocodes() {
  const tbody = document.getElementById('promo-table-body');
  if (!tbody) return;
  try {
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const _db = window._db;
    const snap = await getDocs(collection(_db, 'promocodes'));
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;padding:40px">Промокодов пока нет</td></tr>';
      return;
    }
    tbody.innerHTML = snap.docs.map(d => {
      const p = d.data();
      return `<tr>
        <td><strong>${d.id}</strong></td>
        <td>${p.discount}%</td>
        <td><span class="badge ${p.active ? 'badge-hit' : ''}">${p.active ? 'Активен' : 'Отключён'}</span></td>
        <td style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="togglePromo('${d.id}', ${!p.active})">${p.active ? 'Отключить' : 'Включить'}</button>
          <button class="btn btn-outline btn-sm" style="color:#c00" onclick="deletePromo('${d.id}')">Удалить</button>
        </td>
      </tr>`;
    }).join('');
  } catch(e) { console.error(e); }
}

window.togglePromo = async function(id, active) {
  const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  await updateDoc(doc(db, 'promocodes', id), { active });
  loadPromocodes();
};

window.deletePromo = async function(id) {
  if (!confirm(`Удалить промокод ${id}?`)) return;
  const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  await deleteDoc(doc(db, 'promocodes', id));
  loadPromocodes();
};

document.addEventListener('DOMContentLoaded', () => {
  // Add promo button
  document.getElementById('add-promo-btn')?.addEventListener('click', async () => {
    const code     = prompt('Код промокода (латиница, заглавные):')?.trim().toUpperCase();
    if (!code) return;
    const discount = prompt('Скидка в %:');
    if (!discount || isNaN(discount)) return;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await setDoc(doc(window._db, 'promocodes', code), { discount: Number(discount), active: true });
    showToast(`Промокод ${code} создан`);
    loadPromocodes();
  });

  // Section switching - add users and promocodes
  document.querySelectorAll('.sidebar__item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      if (section === 'users') loadUsers();
      if (section === 'promocodes') loadPromocodes();
      if (section === 'legal') loadLegal();
    });
  });
});

// Explicitly expose to global scope
window.loadUsers = loadUsers;
window.loadPromocodes = loadPromocodes;


// ============================================================
// LEGAL DOCUMENTS
// ============================================================

async function loadLegal() {
  try {
    const settings = await getSettings();
    const fields = ['privacy','delivery','faq','returns','offer','requisites','agreement','cookies'];
    fields.forEach(f => {
      const el = document.getElementById('l-' + f);
      if (el) el.value = settings?.['legal_' + f] || '';
      const urlEl = document.getElementById('l-' + f + '-url');
      if (urlEl) urlEl.value = settings?.['legal_' + f + '_url'] || '';
    });
  } catch(e) { console.error('loadLegal error:', e); }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('save-legal-btn')?.addEventListener('click', async () => {
    const fields = ['privacy','delivery','faq','returns','offer','requisites','agreement','cookies'];
    const data = {};
    fields.forEach(f => {
      data['legal_' + f] = document.getElementById('l-' + f)?.value.trim() || '';
      data['legal_' + f + '_url'] = document.getElementById('l-' + f + '-url')?.value.trim() || '';
    });
    try {
      const { doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const ref = doc(window._db, 'settings', 'main');
      const snap = await getDoc(ref);
      const existing = snap.exists() ? snap.data() : {};
      await setDoc(ref, { ...existing, ...data });
      showToast('Документы сохранены');
    } catch(e) {
      showToast('Ошибка: ' + e.message);
    }
  });
});

// ============================================================
// DASHBOARD ANALYTICS
// ============================================================

window.loadDashboard = async function loadDashboard(days = 30) {
  try {
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const _db = window._db;
    if (!_db) return;
    const since = new Date(); since.setDate(since.getDate() - days);
    const [ordersSnap, productsSnap, usersSnap] = await Promise.all([
      getDocs(collection(_db, 'orders')),
      getDocs(collection(_db, 'products')),
      getDocs(collection(_db, 'users'))
    ]);
    const allProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allOrders   = ordersSnap.docs.map(d => d.data());
    const recent      = allOrders.filter(o => (o.createdAt?.toDate?.() || new Date(0)) >= since);
    const revenue     = recent.reduce((s,o) => s + (o.total||0), 0);
    const customers   = new Set(recent.map(o => o.userId||o.customerEmail).filter(Boolean)).size;
    const avg         = recent.length ? Math.round(revenue/recent.length) : 0;
    const lowStock    = allProducts.filter(p => p.stock !== undefined && p.stock <= (p.stockMin||5)).length;

    const el = id => document.getElementById(id);
    if(el('stat-products'))  el('stat-products').textContent  = allProducts.filter(p=>p.active).length;
    if(el('stat-orders'))    el('stat-orders').textContent    = recent.length;
    if(el('stat-revenue'))   el('stat-revenue').textContent   = revenue.toLocaleString('ru-RU') + ' ₽';
    if(el('stat-customers')) el('stat-customers').textContent = customers;
    if(el('stat-avg'))       el('stat-avg').textContent       = avg.toLocaleString('ru-RU') + ' ₽';
    if(el('stat-low-stock')) el('stat-low-stock').textContent = lowStock || '—';
  } catch(e) { console.warn('Dashboard error:', e); }
}

window.loadSales = async function loadSales(days = 30) {
  // Highlight active period button
  [7, 30, 90].forEach(d => {
    const btn = document.getElementById('period-' + d);
    if (btn) btn.style.background = d === days ? '#111' : '';
    if (btn) btn.style.color = d === days ? '#fff' : '';
  });

  try {
    const { collection, getDocs, query, where, orderBy, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const _db = window._db;
    if (!_db) return;

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Load orders
    const ordersSnap = await getDocs(collection(_db, 'orders'));
    const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const recentOrders = allOrders.filter(o => {
      const ts = o.createdAt?.toDate?.() || new Date(0);
      return ts >= since;
    });

    // Load products for stock
    const productsSnap = await getDocs(collection(_db, 'products'));
    const allProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // KPIs
    const revenue = recentOrders.reduce((s, o) => s + (o.total || 0), 0);
    const uniqueCustomers = new Set(recentOrders.map(o => o.userId || o.customerEmail).filter(Boolean)).size;
    const avgCheck = recentOrders.length ? Math.round(revenue / recentOrders.length) : 0;
    const lowStock = allProducts.filter(p => p.stock !== undefined && p.stock <= (p.stockMin || 5)).length;

    const el = id => document.getElementById(id);
    el('stat-products').textContent = allProducts.filter(p => p.active).length;
    el('stat-orders').textContent   = recentOrders.length;
    el('stat-revenue').textContent  = revenue.toLocaleString('ru-RU') + ' ₽';
    el('stat-customers').textContent = uniqueCustomers;
    el('stat-avg').textContent      = avgCheck.toLocaleString('ru-RU') + ' ₽';
    el('stat-low-stock').textContent = lowStock || '—';
    const pl = document.getElementById('sales-period-label'); if(pl) pl.textContent = `за ${days} дней`;

    // Revenue by day chart
    const dayMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dayMap[d.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit' })] = 0;
    }
    recentOrders.forEach(o => {
      const d = o.createdAt?.toDate?.();
      if (d) {
        const key = d.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit' });
        if (key in dayMap) dayMap[key] += o.total || 0;
      }
    });
    drawRevenueChart(Object.keys(dayMap), Object.values(dayMap));

    // Top products
    const productSales = {};
    recentOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const id = item.id || item.productId;
        if (!id) return;
        productSales[id] = (productSales[id] || 0) + (item.qty || 1);
      });
    });

    const topList = document.getElementById('top-products-list');
    const sorted = Object.entries(productSales).sort((a,b) => b[1]-a[1]).slice(0, 10);
    if (sorted.length === 0) {
      topList.innerHTML = '<p style="color:#aaa;font-size:13px;padding:16px 0">Нет данных о продажах</p>';
    } else {
      const maxQty = sorted[0][1];
      topList.innerHTML = sorted.map(([id, qty]) => {
        const p = allProducts.find(x => x.id === id);
        const name = p?.name || id;
        const pct = Math.round(qty / maxQty * 100);
        return `<div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
            <span style="color:#111;font-weight:500">${name.slice(0,50)}${name.length>50?'…':''}</span>
            <span style="color:#666">${qty} шт.</span>
          </div>
          <div style="background:#f5f5f5;height:6px;border-radius:3px">
            <div style="background:#111;height:6px;border-radius:3px;width:${pct}%"></div>
          </div>
        </div>`;
      }).join('');
    }

  } catch(e) {
    console.error('Dashboard error:', e);
  }
}

function drawRevenueChart(labels, data) {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 600;
  const H = 160;
  canvas.width = W;
  canvas.height = H;

  const max = Math.max(...data, 1);
  const pad = { top: 20, right: 10, bottom: 30, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = Math.max(2, chartW / data.length - 4);

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (chartH / 4 * i);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#aaa';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(max / 4 * i).toLocaleString('ru-RU'), pad.left - 6, y + 3);
  }

  // Bars
  data.forEach((val, i) => {
    const x = pad.left + i * (chartW / data.length) + (chartW / data.length - barW) / 2;
    const h = val / max * chartH;
    const y = pad.top + chartH - h;
    ctx.fillStyle = val > 0 ? '#111' : '#eee';
    ctx.fillRect(x, y, barW, h);
  });

  // Labels (every Nth)
  const step = Math.ceil(labels.length / 10);
  ctx.fillStyle = '#aaa';
  ctx.font = '9px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    if (i % step === 0) {
      const x = pad.left + i * (chartW / data.length) + chartW / data.length / 2;
      ctx.fillText(lbl, x, H - 6);
    }
  });
}

// Auto-load dashboard when section opens
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar__item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.section === 'dashboard') loadDashboard(30);
      if (item.dataset.section === 'sales') loadSales(30);
      if (item.dataset.section === 'orders') loadOrders();
    });
  });
});
