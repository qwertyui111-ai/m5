/**
 * MASURA — Cache Module
 * Кэширует данные Firebase в localStorage
 */

const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 часа

const Cache = {
  get(key) {
    try {
      const raw = localStorage.getItem('masura_cache_' + key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) {
        localStorage.removeItem('masura_cache_' + key);
        return null;
      }
      return data;
    } catch(e) { return null; }
  },

  set(key, data) {
    try {
      localStorage.setItem('masura_cache_' + key, JSON.stringify({ data, ts: Date.now() }));
    } catch(e) {}
  },

  invalidate(key) {
    try { localStorage.removeItem('masura_cache_' + key); } catch(e) {}
  },

  invalidateAll() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('masura_cache_'))
        .forEach(k => localStorage.removeItem(k));
    } catch(e) {}
  }
};

export { Cache };
