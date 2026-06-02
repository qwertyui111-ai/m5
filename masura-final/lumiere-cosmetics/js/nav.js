/**
 * MASURA — Navigation (MOON style)
 */

function renderNav(activePage) {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const inPages = window.location.pathname.includes('/pages/');
  const root    = inPages ? '../' : './';

  nav.innerHTML = `
    <div class="nav__inner">
      <nav class="nav__links" id="nav-links">
        <a href="${root}index.html" class="nav__link ${activePage === 'catalog' ? 'active' : ''}">Каталог</a>
        <a href="${root}pages/cart.html" class="nav__link ${activePage === 'cart' ? 'active' : ''}">Корзина</a>
      </nav>

      <a href="${root}index.html" class="nav__logo">Masura</a>

      <div class="nav__actions">
        <button class="nav__icon-btn nav__cart-btn" onclick="window.location.href='${root}pages/cart.html'" aria-label="Корзина">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <span class="nav__cart-count" aria-live="polite"></span>
        </button>

        <button class="nav__hamburger" id="nav-hamburger" aria-label="Меню">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  `;

  const hamburger = document.getElementById('nav-hamburger');
  const links = document.getElementById('nav-links');
  hamburger?.addEventListener('click', () => links.classList.toggle('open'));
}
