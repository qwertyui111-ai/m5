/**
 * LUMIÈRE — Homepage Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  renderNav('home');
  renderFeaturedProducts();
  renderMarquee();
});

// ---- Featured products on homepage (first 4 active) ----
function renderFeaturedProducts() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  const featured = getActiveProducts().slice(0, 4);

  grid.innerHTML = featured.map(p => {
    const badgeHTML = p.badge
      ? `<span class="product-card__badge ${p.badge === 'New' ? 'product-card__badge--new' : ''}">${p.badge}</span>`
      : '';

    return `
      <article class="product-card animate-fade-up" style="animation-delay:${featured.indexOf(p) * 0.1}s">
        ${badgeHTML}
        <div class="product-card__image-wrap">
          <div class="product-card__image-placeholder" aria-hidden="true">${p.emoji || '✦'}</div>
        </div>
        <div class="product-card__info">
          <p class="product-card__category">${p.category}</p>
          <h3 class="product-card__name">${p.name}</h3>
          <p class="product-card__desc">${p.description}</p>
          <div class="product-card__footer">
            <div class="product-card__price">${formatPrice(p.price)}</div>
            <button class="product-card__add-btn" data-id="${p.id}" aria-label="Добавить в корзину">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.product-card__add-btn').forEach(btn => {
    btn.addEventListener('click', () => Cart.add(btn.dataset.id));
  });
}

// ---- Duplicate marquee items for seamless loop ----
function renderMarquee() {
  const track = document.getElementById('marquee-track');
  if (!track) return;
  track.innerHTML += track.innerHTML; // duplicate for seamless CSS loop
}
