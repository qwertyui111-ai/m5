/**
 * LUMIÈRE — Cart
 * ==============
 * Uses localStorage for persistence across pages.
 * Dispatches custom events so any page can react to changes.
 */

const Cart = (() => {
  const STORAGE_KEY = 'lumiere_cart';

  // ---- Internal state ----
  let items = load();

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
  }

  // ---- Public API ----
  function add(productId, qty = 1) {
    const product = getProductById(productId);
    if (!product) return;

    const existing = items.find(i => i.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({ id: productId, qty });
    }
    save();
    showToast(`«${product.name}» добавлен в корзину`);
  }

  function remove(productId) {
    items = items.filter(i => i.id !== productId);
    save();
  }

  function setQty(productId, qty) {
    if (qty < 1) { remove(productId); return; }
    const existing = items.find(i => i.id === productId);
    if (existing) {
      existing.qty = qty;
      save();
    }
  }

  function clear() {
    items = [];
    save();
  }

  function getItems() {
    return items.map(i => ({
      ...i,
      product: getProductById(i.id),
    })).filter(i => i.product);
  }

  function getCount() {
    return items.reduce((sum, i) => sum + i.qty, 0);
  }

  function getSubtotal() {
    return getItems().reduce((sum, i) => sum + i.product.price * i.qty, 0);
  }

  function getDelivery() {
    const sub = getSubtotal();
    return sub === 0 ? 0 : sub >= 5000 ? 0 : 390;
  }

  function getTotal() {
    return getSubtotal() + getDelivery();
  }

  return { add, remove, setQty, clear, getItems, getCount, getSubtotal, getDelivery, getTotal };
})();

// ---- Toast helper ----
function showToast(message, duration = 3000) {
  // Remove existing toast
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

// ---- Update nav badge on every page ----
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
