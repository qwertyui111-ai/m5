/**
 * LUMIÈRE — Database Service
 */

import { db } from './firebase-config.js';
import {
  collection, doc,
  getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============================================================
// PRODUCTS
// ============================================================

export async function getProducts() {
  const snap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getActiveProducts() {
  const snap = await getDocs(
    query(collection(db, 'products'), where('active', '==', true), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getProductById(id) {
  const snap = await getDoc(doc(db, 'products', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addProduct(data) {
  return addDoc(collection(db, 'products'), {
    ...data,
    active: true,
    createdAt: serverTimestamp(),
  });
}

export async function updateProduct(id, data) {
  return updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id) {
  return deleteDoc(doc(db, 'products', id));
}

// ============================================================
// CATEGORIES
// ============================================================

export async function getCategories() {
  const snap = await getDocs(query(collection(db, 'categories'), orderBy('order')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addCategory(data) {
  return addDoc(collection(db, 'categories'), data);
}

export async function updateCategory(id, data) {
  return updateDoc(doc(db, 'categories', id), data);
}

export async function deleteCategory(id) {
  return deleteDoc(doc(db, 'categories', id));
}

// ============================================================
// SETTINGS
// ============================================================

export async function getSettings() {
  const snap = await getDoc(doc(db, 'settings', 'main'));
  return snap.exists() ? snap.data() : getDefaultSettings();
}

export async function saveSettings(data) {
  return setDoc(doc(db, 'settings', 'main'), data, { merge: true });
}

function getDefaultSettings() {
  return {
    heroTitle:    'Красота — это ритуал',
    heroSubtitle: 'Японский маникюр. Профессиональные материалы.',
    heroEyebrow:  'Новая коллекция 2025',
    heroCta:      'Смотреть каталог',
    heroTag:      'Японский маникюр',
    marqueeItems: ['Японский маникюр', 'Профессиональные материалы', 'Быстрая доставка', 'Широкий ассортимент'],
  };
}

// ============================================================
// ORDERS
// ============================================================

export async function getOrders() {
  const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createOrder(data) {
  return addDoc(collection(db, 'orders'), {
    ...data,
    status: 'new',
    createdAt: serverTimestamp(),
  });
}

export async function updateOrderStatus(id, status) {
  return updateDoc(doc(db, 'orders', id), { status, updatedAt: serverTimestamp() });
}

// ============================================================
// SEED — первоначальное заполнение (запускается один раз)
// ============================================================

// Твои реальные категории из InSales
const REAL_CATEGORIES = [
  { id: 'hits',               label: 'Хиты продаж',      order: 1 },
  { id: 'new',                label: 'Новинки',           order: 2 },
  { id: 'aktsii',             label: 'Акции',             order: 3 },
  { id: 'yaponskiy-manikyur', label: 'Японский маникюр',  order: 4 },
  { id: 'mini-nabory',        label: 'Мини наборы',       order: 5 },
  { id: 'pasty-i-pudry',      label: 'Пасты и пудры',     order: 6 },
  { id: 'laki',               label: 'Лаки',              order: 7 },
  { id: 'golograficheskie',   label: 'Голографические',   order: 8 },
  { id: 'magnitnye',          label: 'Магнитные',         order: 9 },
  { id: 'glazter',            label: 'С глиттером',       order: 10 },
  { id: 'termo',              label: 'Лечебные',          order: 11 },
  { id: 's-shimmerom',        label: 'С шиммером',        order: 12 },
  { id: 'so-slyudoy',         label: 'Со слюдой',         order: 13 },
  { id: 'bez-napolneniya',    label: 'Без наполнения',    order: 14 },
  { id: 'uhod-za-kutikuloy',  label: 'Уход за кутикулой', order: 15 },
];

export async function seedDatabase() {
  // Проверяем категории — если выдуманные, заменяем на реальные
  const existingCats = await getDocs(collection(db, 'categories'));
  const catIds = existingCats.docs.map(d => d.id);
  const hasRealCats = catIds.includes('yaponskiy-manikyur');

  if (!hasRealCats) {
    // Удаляем старые выдуманные категории
    for (const d of existingCats.docs) {
      await deleteDoc(doc(db, 'categories', d.id));
    }
    // Добавляем реальные
    for (const cat of REAL_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), { label: cat.label, order: cat.order });
    }
    console.log('✅ Категории обновлены на реальные');
  }

  // Settings — только если нет
  const settingsSnap = await getDoc(doc(db, 'settings', 'main'));
  if (!settingsSnap.exists()) {
    await saveSettings(getDefaultSettings());
  }
}
