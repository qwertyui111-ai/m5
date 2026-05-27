/**
 * LUMIÈRE — Admin Panel Logic
 */

import { auth } from './firebase-config.js';
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

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById('login-screen').style.display  = 'none';
    document.getElementById('admin-app').style.display     = 'grid';
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

async function loadDashboard() {
  const [products, categories, orders] = await Promise.all([
    getProducts(), getCategories(), getOrders()
  ]);

  document.getElementById('stat-products').textContent   = products.length;
  document.getElementById('stat-categories').textContent = categories.length;
  document.getElementById('stat-orders').textContent     = orders.length;
  document.getElementById('stat-new-orders').textContent = orders.filter(o => o.status === 'new').length;

  const tbody = document.getElementById('recent-orders-body');
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
}

// ============================================================
// PRODUCTS
// ============================================================

let allProducts = [];
let allCategories = [];

async function loadProducts() {
  [allProducts, allCategories] = await Promise.all([getProducts(), getCategories()]);
  renderProductsTable(allProducts);
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
        <div style="display:flex;align-items:center;gap:12px">
          <div class="product-emoji">${p.emoji || '✦'}</div>
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
    const q = input.value.toLowerCase();
    renderProductsTable(allProducts.filter(p =>
      p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    ));
  };
}

document.getElementById('add-product-btn').addEventListener('click', () => {
  document.getElementById('product-modal-title').textContent = 'Новый товар';
  document.getElementById('pm-id').value          = '';
  document.getElementById('pm-name').value        = '';
  document.getElementById('pm-description').value = '';
  document.getElementById('pm-price').value       = '';
  document.getElementById('pm-emoji').value       = '✦';
  document.getElementById('pm-badge').value       = '';
  document.getElementById('pm-active').checked    = true;
  document.getElementById('pm-color').value        = '';
  document.getElementById('pm-effect').value       = '';
  document.getElementById('pm-type').value         = '';
  document.getElementById('pm-ai-status').textContent = '';
  populateCategoryCheckboxes([]);
  bindAiTagsBtn();
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
  document.getElementById('pm-emoji').value       = p.emoji || '';
  document.getElementById('pm-badge').value       = p.badge || '';
  document.getElementById('pm-active').checked    = p.active !== false;
  document.getElementById('pm-color').value        = p.color  || '';
  document.getElementById('pm-effect').value       = p.effect || '';
  document.getElementById('pm-type').value         = p.productType || '';
  populateCategoryCheckboxes(Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : []));
  bindAiTagsBtn();
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
    emoji:       document.getElementById('pm-emoji').value || '✦',
    badge:       document.getElementById('pm-badge').value || null,
    active:      document.getElementById('pm-active').checked,
    color:       document.getElementById('pm-color').value.trim(),
    effect:      document.getElementById('pm-effect').value.trim(),
    productType: document.getElementById('pm-type').value.trim(),
  };

  if (id) {
    await updateProduct(id, data);
    toast('Товар обновлён ✓');
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
  document.getElementById('s-eyebrow').value  = s.heroEyebrow  || '';
  document.getElementById('s-title').value    = s.heroTitle    || '';
  document.getElementById('s-subtitle').value = s.heroSubtitle || '';
  document.getElementById('s-cta').value      = s.heroCta      || '';
  document.getElementById('s-tag').value      = s.heroTag      || '';
  document.getElementById('s-marquee').value  = (s.marqueeItems || []).join(', ');
  document.getElementById('s-image').value     = s.heroImage  || '';
}

document.getElementById('save-settings-btn').addEventListener('click', async () => {
  const marqueeRaw = document.getElementById('s-marquee').value;
  await saveSettings({
    heroEyebrow:  document.getElementById('s-eyebrow').value.trim(),
    heroTitle:    document.getElementById('s-title').value.trim(),
    heroSubtitle: document.getElementById('s-subtitle').value.trim(),
    heroCta:      document.getElementById('s-cta').value.trim(),
    heroTag:      document.getElementById('s-tag').value.trim(),
    marqueeItems: marqueeRaw.split(',').map(s => s.trim()).filter(Boolean),
    heroImage:    document.getElementById('s-image').value.trim(),
  });
  toast('Настройки сохранены ✓');
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
