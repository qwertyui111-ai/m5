/**
 * LUMIÈRE — Products Data
 * ========================
 * To add a new product: copy one object, change its id and fields.
 * To add a new category: add it to CATEGORIES below, then use it in a product.
 * Never remove existing products — set active: false to hide them.
 */

const CATEGORIES = [
  { id: 'all',        label: 'Все' },
  { id: 'face',       label: 'Лицо' },
  { id: 'lips',       label: 'Губы' },
  { id: 'eyes',       label: 'Глаза' },
  { id: 'skincare',   label: 'Уход' },
  { id: 'body',       label: 'Тело' },
  // ↑ добавляйте новые категории здесь
];

const PRODUCTS = [
  // ——— Skincare ———
  {
    id: 'p001',
    name: 'Sérum Lumière',
    category: 'skincare',
    price: 4200,
    description: 'Сыворотка с гиалуроновой кислотой для глубокого увлажнения и сияния',
    emoji: '✦',
    badge: null,
    active: true,
  },
  {
    id: 'p002',
    name: 'Crème Velours',
    category: 'skincare',
    price: 3600,
    description: 'Бархатный дневной крем с розовым маслом. SPF 20',
    emoji: '◈',
    badge: 'Хит',
    active: true,
  },
  {
    id: 'p003',
    name: 'Masque Nuit',
    category: 'skincare',
    price: 3100,
    description: 'Ночная маска с пептидами для восстановления кожи во сне',
    emoji: '◉',
    badge: null,
    active: true,
  },

  // ——— Face ———
  {
    id: 'p004',
    name: 'Fond de Teint',
    category: 'face',
    price: 2900,
    description: 'Тональный флюид с натуральным финишем. 12 оттенков',
    emoji: '◫',
    badge: 'New',
    active: true,
  },
  {
    id: 'p005',
    name: 'Poudre Soleil',
    category: 'face',
    price: 2400,
    description: 'Бронзирующая пудра для sculpting-эффекта',
    emoji: '◌',
    badge: null,
    active: true,
  },
  {
    id: 'p006',
    name: 'Blush Nuage',
    category: 'face',
    price: 1900,
    description: 'Невесомые румяна с сатиновым финишем',
    emoji: '◍',
    badge: null,
    active: true,
  },

  // ——— Lips ———
  {
    id: 'p007',
    name: 'Rouge Absolu',
    category: 'lips',
    price: 2200,
    description: 'Кремовая помада с насыщенным пигментом и маслом ши',
    emoji: '◆',
    badge: 'Хит',
    active: true,
  },
  {
    id: 'p008',
    name: 'Gloss Mirage',
    category: 'lips',
    price: 1600,
    description: 'Объёмный блеск с отражающими частицами',
    emoji: '◇',
    badge: null,
    active: true,
  },

  // ——— Eyes ———
  {
    id: 'p009',
    name: 'Palette Aurore',
    category: 'eyes',
    price: 4800,
    description: '12 оттенков теней от нюдовых до глубоких. Матовые и шиммерные',
    emoji: '◈',
    badge: 'New',
    active: true,
  },
  {
    id: 'p010',
    name: 'Mascara Volume',
    category: 'eyes',
    price: 1800,
    description: 'Объёмная тушь с разделяющим эффектом. Держится 24 ч',
    emoji: '◉',
    badge: null,
    active: true,
  },

  // ——— Body ———
  {
    id: 'p011',
    name: 'Huile Précieuse',
    category: 'body',
    price: 2800,
    description: 'Сухое масло с арганом и жожоба. Для кожи и волос',
    emoji: '◎',
    badge: null,
    active: true,
  },
  {
    id: 'p012',
    name: 'Gommage Perle',
    category: 'body',
    price: 2100,
    description: 'Перламутровый скраб с морской солью и кокосовым маслом',
    emoji: '◐',
    badge: null,
    active: true,
  },

  // ↑ Добавляйте новые товары здесь
];

// Helpers — не трогать
function getActiveProducts() {
  return PRODUCTS.filter(p => p.active !== false);
}

function getProductById(id) {
  return PRODUCTS.find(p => p.id === id);
}

function formatPrice(amount) {
  return amount.toLocaleString('ru-RU') + ' ₽';
}
