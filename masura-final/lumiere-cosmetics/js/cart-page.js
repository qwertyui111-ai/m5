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

// ---- Cart item HTML ----
function renderCartItem(item) {
  const p = item.product;
  return `
    <div class="cart-item" data-id="${p.id}">
      <div class="cart-item__image" aria-hidden="true">${p.emoji || '✦'}</div>

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
  const sub      = Cart.getSubtotal();
  const delivery = Cart.getDelivery();
  const total    = Cart.getTotal();
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
function applyPromo() {
  const input = document.getElementById('promo-code');
  const code  = input?.value.trim().toUpperCase();
  if (!code) return;
  // TODO: integrate with backend
  showToast(`Промокод «${code}» не найден`);
}

// ---- Checkout (placeholder) ----
function handleCheckout() {
  if (Cart.getCount() === 0) return;
  showToast('Функция оформления заказа в разработке');
}

// ---- Helper ----
function getCategoryLabel(id) {
  return (typeof CATEGORIES !== 'undefined')
    ? (CATEGORIES.find(c => c.id === id)?.label || id)
    : id;
}
