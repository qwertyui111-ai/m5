/**
 * MASURA — Navigation Component
 */

function renderNav(activePage = '') {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const inPages = window.location.pathname.includes('/pages/');
  const root    = inPages ? '../' : './';

  const catalogActive = activePage === 'catalog' || activePage === 'home';

  nav.innerHTML = `
    <div class="container">
      <div class="nav__inner">
        <a href="${root}index.html" class="nav__logo">Masura</a>

        <nav class="nav__links" id="nav-links" role="navigation" aria-label="Основное меню">
          <a href="${root}index.html"      class="nav__link ${catalogActive ? 'active' : ''}">Каталог</a>
          <a href="${root}pages/cart.html" class="nav__link ${activePage === 'cart' ? 'active' : ''}">Корзина</a>
        </nav>

        <button
          class="nav__cart"
          onclick="window.location.href='${root}pages/cart.html'"
          aria-label="Корзина"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <span class="nav__cart-text">Корзина</span>
          <span class="nav__cart-count" aria-live="polite"></span>
        </button>

        <button
          class="nav__hamburger"
          id="nav-hamburger"
          aria-label="Открыть меню"
          aria-expanded="false"
          aria-controls="nav-links"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  `;

  const hamburger = document.getElementById('nav-hamburger');
  const links     = document.getElementById('nav-links');
  hamburger?.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
  });
}
