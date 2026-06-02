/**
 * MASURA — Cart
 * Хранит товары в localStorage.
 * Товар добавляется вместе с данными (name, price, image)
 * чтобы не зависеть от products.js
 */

const Cart = (() => {
  const STORAGE_KEY = 'masura_cart';

  let items = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
  }

  // Добавить товар — принимает id или объект товара
  function add(productIdOrObj, qty = 1) {
    let id, productData;

    if (typeof productIdOrObj === 'object') {
      id = productIdOrObj.id;
      productData = productIdOrObj;
    } else {
      id = productIdOrObj;
      productData = null;
    }

    const existing = items.find(i => i.id === id);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id,
        qty,
        name:  productData?.name  || '',
        price: productData?.price || 0,
        image: productData?.image || null,
        emoji: productData?.emoji || '✦',
        category: productData?.category || '',
      });
    }
    save();
    const name = productData?.name || existing?.name || '';
    if (name) showToast(`«${name}» добавлен в корзину`);
  }

  function remove(productId) {
    items = items.filter(i => i.id !== productId);
    save();
  }

  function setQty(productId, qty) {
    if (qty < 1) { remove(productId); return; }
    const existing = items.find(i => i.id === productId);
    if (existing) { existing.qty = qty; save(); }
  }

  function clear() { items = []; save(); }

  function getItems() {
    return items.map(i => ({
      ...i,
      product: {
        id: i.id,
        name: i.name,
        price: i.price,
        image: i.image,
        emoji: i.emoji,
        category: i.category,
      }
    }));
  }

  function getCount() { return items.reduce((s, i) => s + i.qty, 0); }
  function getSubtotal() { return items.reduce((s, i) => s + i.price * i.qty, 0); }
  function getDelivery() { const sub = getSubtotal(); return sub === 0 ? 0 : sub >= 5000 ? 0 : 390; }
  function getTotal() { return getSubtotal() + getDelivery(); }

  return { add, remove, setQty, clear, getItems, getCount, getSubtotal, getDelivery, getTotal };
})();

function showToast(message, duration = 3000) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    ${message}
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function updateCartBadge() {
  const count = Cart.getCount();
  document.querySelectorAll('.nav__cart-count').forEach(el => {
    el.textContent = count;
    el.classList.toggle('visible', count > 0);
  });
  document.querySelectorAll('.nav__cart-text').forEach(el => {
    el.textContent = count > 0 ? `Корзина (${count})` : 'Корзина';
  });
}

document.addEventListener('cart:updated', updateCartBadge);
document.addEventListener('DOMContentLoaded', updateCartBadge);
