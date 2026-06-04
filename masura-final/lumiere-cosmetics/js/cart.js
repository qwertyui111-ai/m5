/**
 * MASURA — Cart
 * Хранит корзину в localStorage.
 * Если пользователь залогинен — синхронизирует с Firebase.
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
    syncToFirebase();
  }

  // Синхронизация с Firebase если пользователь залогинен
  async function syncToFirebase() {
    try {
      const base = window.location.pathname.includes('/pages/') ? '../js/' : './js/';
      const { auth, db } = await import(base + 'firebase-config.js').catch(() => ({}));
      if (!auth || !db) return;
      const user = auth.currentUser;
      if (!user) return;
      const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      await updateDoc(doc(db, 'users', user.uid), { cart: items });
    } catch(e) {}
  }

  // Загрузка корзины из Firebase при входе
  async function loadFromFirebase() {
    try {
      const base = window.location.pathname.includes('/pages/') ? '../js/' : './js/';
      const { auth, db } = await import(base + 'firebase-config.js').catch(() => ({}));
      if (!auth || !db) return;
      const user = auth.currentUser;
      if (!user) return;
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists() && Array.isArray(snap.data().cart)) {
        items = snap.data().cart;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
      }
    } catch(e) {}
  }

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

  function clear() {
    items = [];
    localStorage.removeItem(STORAGE_KEY);
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { items: [] } }));
  }

  function getItems() { return items; }
  function getCount() { return items.reduce((s, i) => s + i.qty, 0); }
  function getSubtotal() { return items.reduce((s, i) => s + (i.price || 0) * i.qty, 0); }
  function getDelivery() { const s = getSubtotal(); return s === 0 ? 0 : s >= 5000 ? 0 : 390; }
  function getTotal() { return getSubtotal() + getDelivery(); }

  return { add, remove, setQty, clear, getItems, getCount, getSubtotal, getDelivery, getTotal, loadFromFirebase };
})();

// Toast
function showToast(message, duration = 3000) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-hide'); setTimeout(() => toast.remove(), 300); }, duration);
}

// Nav badge
function updateCartBadge() {
  const count = Cart.getCount();
  document.querySelectorAll('.nav__cart-count').forEach(el => {
    el.textContent = count;
    el.classList.toggle('visible', count > 0);
  });
}

document.addEventListener('cart:updated', updateCartBadge);
document.addEventListener('DOMContentLoaded', updateCartBadge);

// При загрузке — если пользователь залогинен, загружаем его корзину
document.addEventListener('DOMContentLoaded', async function() {
  try {
    const base = window.location.pathname.includes('/pages/') ? '../js/' : './js/';
    const { auth } = await import(base + 'firebase-config.js').catch(() => ({}));
    if (!auth) return;
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    onAuthStateChanged(auth, function(user) {
      if (user) {
        Cart.loadFromFirebase();
      } else {
        Cart.clear();
      }
    });
  } catch(e) {}
});
