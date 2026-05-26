/**
 * LUMIÈRE — Catalog Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  renderNav('catalog');
  renderFilters();
  renderProducts('all');
  bindFilters();
});

// ---- Render filter buttons ----
function renderFilters() {
  const container = document.getElementById('catalog-filters');
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => `
    <button
      class="filter-btn ${cat.id === 'all' ? 'active' : ''}"
      data-category="${cat.id}"
      aria-pressed="${cat.id === 'all'}"
    >
      ${cat.label}
    </button>
  `).join('');
}

// ---- Render product grid ----
function renderProducts(category = 'all') {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const products = getActiveProducts().filter(
    p => category === 'all' || p.category === category
  );

  if (products.length === 0) {
    grid.innerHTML = `<p class="catalog-empty">Товары не найдены</p>`;
    return;
  }

  grid.innerHTML = products.map(p => renderProductCard(p)).join('');

  // Bind add-to-cart buttons
  grid.querySelectorAll('.product-card__add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      Cart.add(id);

      btn.classList.add('added');
      btn.innerHTML = checkSVG();
      setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = plusSVG();
      }, 1500);
    });
  });
}

// ---- Product card HTML ----
function renderProductCard(p) {
  const badgeHTML = p.badge
    ? `<span class="product-card__badge ${p.badge === 'New' ? 'product-card__badge--new' : ''}">${p.badge}</span>`
    : '';

  return `
    <article class="product-card animate-fade-up" data-category="${p.category}">
      ${badgeHTML}
      <div class="product-card__image-wrap">
        <div class="product-card__image-placeholder" aria-hidden="true">${p.emoji || '✦'}</div>
      </div>
      <div class="product-card__info">
        <p class="product-card__category">${getCategoryLabel(p.category)}</p>
        <h3 class="product-card__name">${p.name}</h3>
        <p class="product-card__desc">${p.description}</p>
        <div class="product-card__footer">
          <div class="product-card__price">
            ${formatPrice(p.price)}
          </div>
          <button
            class="product-card__add-btn"
            data-id="${p.id}"
            aria-label="Добавить ${p.name} в корзину"
          >
            ${plusSVG()}
          </button>
        </div>
      </div>
    </article>
  `;
}

// ---- Bind filter buttons ----
function bindFilters() {
  const container = document.getElementById('catalog-filters');
  if (!container) return;

  container.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    container.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });

    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    renderProducts(btn.dataset.category);
  });
}

// ---- Helpers ----
function getCategoryLabel(id) {
  return CATEGORIES.find(c => c.id === id)?.label || id;
}

function plusSVG() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
}

function checkSVG() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
}
