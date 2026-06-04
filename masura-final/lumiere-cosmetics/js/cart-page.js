/**
 * LUMIÈRE — Cart Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  renderNav('cart');
  renderCart();

  // Re-render when cart changes (qty/remove)
  document.addEventListener('cart:updated', renderCart);
});

// ---- Render full cart page ----
function renderCart() {
  const items = Cart.getItems();
  const container = document.getElementById('cart-content');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = renderEmptyCart();
    return;
  }

  container.innerHTML = `
    <div class="cart-layout">
      <div>
        <div class="cart-items" id="cart-items">
          ${items.map(renderCartItem).join('')}
        </div>
      </div>
      ${renderOrderSummary()}
    </div>
  `;

  bindCartEvents();
}

// ---- Promo/discount state ----
let appliedDiscount = 0;

// ---- Helpers ----
function formatPrice(n) {
  return Number(n || 0).toLocaleString('ru-RU') + ' ₽';
}

// ---- Cart item HTML ----
function renderCartItem(item) {
  const p = item.product || item;
  return `
    <div class="cart-item" data-id="${p.id}">
      <div class="cart-item__image" aria-hidden="true">${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:contain">` : (p.emoji || '✦')}</div>

      <div class="cart-item__info">
        <p class="cart-item__category">${getCategoryLabel(p.category)}</p>
        <h3 class="cart-item__name">${p.name}</h3>
        <div class="cart-item__qty">
          <button class="qty-btn" data-action="decrease" data-id="${p.id}" aria-label="Уменьшить количество">−</button>
          <span class="qty-display" aria-live="polite">${item.qty}</span>
          <button class="qty-btn" data-action="increase" data-id="${p.id}" aria-label="Увеличить количество">+</button>
        </div>
      </div>

      <div class="cart-item__right">
        <span class="cart-item__price">${formatPrice(p.price * item.qty)}</span>
        <button class="cart-item__remove" data-id="${p.id}" aria-label="Удалить ${p.name}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          Удалить
        </button>
      </div>
    </div>
  `;
}

// ---- Order summary HTML ----
function renderOrderSummary() {
  const rawSub   = Cart.getSubtotal();
  const sub      = appliedDiscount > 0 ? Math.round(rawSub * (1 - appliedDiscount / 100)) : rawSub;
  const delivery = Cart.getDelivery();
  const total    = sub + delivery;
  const count    = Cart.getCount();

  return `
    <aside class="order-summary" aria-label="Итог заказа">
      <h2 class="order-summary__title display-font">Итог заказа</h2>

      <div class="summary-row">
        <span>Товары (${count} шт.)</span>
        <span>${formatPrice(sub)}</span>
      </div>
      <div class="summary-row">
        <span>Доставка</span>
        <span>${delivery === 0 ? '<span style="color:var(--color-accent)">Бесплатно</span>' : formatPrice(delivery)}</span>
      </div>
      ${appliedDiscount > 0 ? `<div class="summary-row" style="color:green">
        <span>Скидка ${appliedDiscount}%</span>
        <span>−${formatPrice(rawSub - sub)}</span>
      </div>` : ''}
      ${delivery > 0 ? `
        <p style="font-size:12px; color:var(--color-text-muted); margin:4px 0 0;">
          Бесплатно от 5 000 ₽
        </p>
      ` : ''}

      <div class="promo-section">
        <label for="promo-code">Промокод</label>
        <div class="promo-input-row">
          <input type="text" id="promo-code" placeholder="Введите код" />
          <button class="btn btn-outline btn-sm" onclick="applyPromo()">Применить</button>
        </div>
      </div>

      <div class="summary-row summary-row--total">
        <span>Итого</span>
        <span>${formatPrice(total)}</span>
      </div>

      <button class="btn btn-accent checkout-btn" onclick="handleCheckout()">
        Оформить заказ
      </button>
      <a href="/pages/catalog.html" class="continue-link">Продолжить покупки</a>
    </aside>
  `;
}

// ---- Empty cart HTML ----
function renderEmptyCart() {
  return `
    <div class="cart-empty">
      <div class="cart-empty__icon" aria-hidden="true">✦</div>
      <h2 class="cart-empty__title display-font">Корзина пуста</h2>
      <p class="cart-empty__text">Добавьте товары из нашего каталога</p>
      <a href="/pages/catalog.html" class="btn btn-primary">Перейти в каталог</a>
    </div>
  `;
}

// ---- Bind qty / remove buttons ----
function bindCartEvents() {
  const itemsEl = document.getElementById('cart-items');
  if (!itemsEl) return;

  itemsEl.addEventListener('click', e => {
    const qtyBtn   = e.target.closest('.qty-btn');
    const removeBtn = e.target.closest('.cart-item__remove');

    if (qtyBtn) {
      const id      = qtyBtn.dataset.id;
      const action  = qtyBtn.dataset.action;
      const current = Cart.getItems().find(i => i.id === id)?.qty || 1;

      if (action === 'increase') Cart.setQty(id, current + 1);
      if (action === 'decrease') Cart.setQty(id, current - 1);
    }

    if (removeBtn) {
      Cart.remove(removeBtn.dataset.id);
    }
  });
}

// ---- Promo code (placeholder) ----
async function applyPromo() {
  const input = document.getElementById('promo-code');
  const code  = input?.value.trim().toUpperCase();
  if (!code) return;
  try {
    const { db } = await import('./firebase-config.js').catch(() => ({}));
    if (!db) { showToast('Ошибка подключения'); return; }
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'promocodes', code));
    if (!snap.exists() || !snap.data().active) {
      showToast('Промокод не найден или недействителен');
      return;
    }
    appliedDiscount = snap.data().discount;
    showToast(`Промокод применён — скидка ${appliedDiscount}%`);
    renderCart();
  } catch(e) {
    showToast('Ошибка при проверке промокода');
  }
}

// ---- Checkout (placeholder) ----
async function handleCheckout() {
  if (Cart.getCount() === 0) return;
  try {
    const base = window.location.pathname.includes('/pages/') ? '../js/' : './js/';
    const { auth, db } = await import(base + 'firebase-config.js').catch(() => ({}));
    if (!db) { showToast('Ошибка подключения'); return; }

    const { collection, addDoc, doc, getDoc, updateDoc, increment, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    const items = Cart.getItems();
    const user  = auth?.currentUser;
    const total = appliedDiscount > 0
      ? Math.round(Cart.getSubtotal() * (1 - appliedDiscount / 100)) + Cart.getDelivery()
      : Cart.getTotal();

    // Save order to Firebase
    await addDoc(collection(db, 'orders'), {
      userId:        user?.uid || null,
      customerEmail: user?.email || null,
      items:         items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      total,
      discount:      appliedDiscount,
      status:        'new',
      createdAt:     serverTimestamp()
    });

    // Decrease stock for each item
    for (const item of items) {
      try {
        const productRef = doc(db, 'products', item.id);
        const snap = await getDoc(productRef);
        if (snap.exists() && snap.data().stock !== undefined) {
          await updateDoc(productRef, { stock: Math.max(0, snap.data().stock - item.qty) });
        }
      } catch(e) { console.warn('Stock update error:', e); }
    }

    // Clear cart
    Cart.clear();
    appliedDiscount = 0;
    showToast('Заказ оформлен! Мы свяжемся с вами.');
    renderCart();

  } catch(e) {
    console.error('Checkout error:', e);
    showToast('Ошибка при оформлении заказа');
  }
}

// ---- Helper ----
function getCategoryLabel(id) {
  return (typeof CATEGORIES !== 'undefined')
    ? (CATEGORIES.find(c => c.id === id)?.label || id)
    : id;
}
