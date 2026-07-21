/**
 * sidebar.js — Shared sidebar for M-PESA Merchant Portal
 * Inject this before </body> on every portal page (except login & print).
 * Requires portal.css + lucide to be loaded.
 */
(function () {
  /* ── 1. Build sidebar HTML (all icons via data-lucide) ── */
  const sidebarHTML = `
<aside class="portal-sidebar" id="portalSidebar" role="navigation" aria-label="Main navigation">
  <div class="sb-header">
    <div class="sb-logos">
      <div class="sb-logo-box">
        <img src="M-Pesa-Logo.png" alt="M-PESA" />
      </div>
      <div class="sb-divider"></div>
      <span class="sb-brand-text">Merchant<br>Portal</span>
    </div>
    <button class="sb-toggle" id="sbToggle" aria-label="Collapse sidebar" title="Toggle sidebar">
      <i data-lucide="chevron-left"></i>
    </button>
  </div>

  <nav>
    <ul class="sb-nav" id="sbNav">

      <!-- Merchant Promo -->
      <li class="sb-item" id="sb-merchant-promo">
        <div class="sb-link sb-has-sub" role="button" tabindex="0" aria-expanded="false">
          <span class="sb-link-icon"><i data-lucide="layout-dashboard"></i></span>
          <span class="sb-link-text">Merchant Promo</span>
          <span class="sb-arrow"><i data-lucide="chevron-down"></i></span>
        </div>
        <ul class="sb-sub">
          <li class="sb-item">
            <a class="sb-link sb-sub-link" href="home.html" data-page="home">
              <span class="sb-link-icon"><i data-lucide="trophy"></i></span>
              <span class="sb-link-text">Merchant Draw</span>
            </a>
          </li>
          <li class="sb-item">
            <a class="sb-link sb-sub-link" href="eligibility.html" data-page="eligibility">
              <span class="sb-link-icon"><i data-lucide="shield-check"></i></span>
              <span class="sb-link-text">Check Eligibility</span>
            </a>
          </li>
          <li class="sb-item">
            <a class="sb-link sb-sub-link" href="blacklist.html" data-page="blacklist">
              <span class="sb-link-icon"><i data-lucide="user-x"></i></span>
              <span class="sb-link-text">BlackList</span>
            </a>
          </li>
        </ul>
      </li>

      <!-- Bundle Invite -->
      <li class="sb-item">
        <a class="sb-link" href="#" data-page="bundle-invite">
          <span class="sb-link-icon"><i data-lucide="gift"></i></span>
          <span class="sb-link-text">Bundle Invite</span>
        </a>
      </li>

      <!-- Account Links -->
      <li class="sb-item" id="sb-account-links">
        <div class="sb-link sb-has-sub" role="button" tabindex="0" aria-expanded="false">
          <span class="sb-link-icon"><i data-lucide="link-2"></i></span>
          <span class="sb-link-text">Account Links</span>
          <span class="sb-arrow"><i data-lucide="chevron-down"></i></span>
        </div>
        <ul class="sb-sub">
          <li class="sb-item">
            <a class="sb-link sb-sub-link" href="#" data-page="link-account">
              <span class="sb-link-icon"><i data-lucide="log-in"></i></span>
              <span class="sb-link-text">Link Account</span>
            </a>
          </li>
          <li class="sb-item">
            <a class="sb-link sb-sub-link" href="#" data-page="unlink-account">
              <span class="sb-link-icon"><i data-lucide="log-out"></i></span>
              <span class="sb-link-text">Unlink Account</span>
            </a>
          </li>
        </ul>
      </li>

      <!-- Mpesa Equb -->
      <li class="sb-item">
        <a class="sb-link" href="#" data-page="mpesa-equb">
          <span class="sb-link-icon"><i data-lucide="shield-check"></i></span>
          <span class="sb-link-text">Mpesa Equb</span>
        </a>
      </li>

      <!-- Over Draft -->
      <li class="sb-item">
        <a class="sb-link" href="#" data-page="over-draft">
          <span class="sb-link-icon"><i data-lucide="landmark"></i></span>
          <span class="sb-link-text">Over Draft</span>
        </a>
      </li>

      <!-- Term Loan -->
      <li class="sb-item" id="sb-term-loan">
        <div class="sb-link sb-has-sub" role="button" tabindex="0" aria-expanded="false">
          <span class="sb-link-icon"><i data-lucide="credit-card"></i></span>
          <span class="sb-link-text">Term Loan</span>
          <span class="sb-arrow"><i data-lucide="chevron-down"></i></span>
        </div>
        <ul class="sb-sub">
          <li class="sb-item">
            <a class="sb-link sb-sub-link" href="#" data-page="loan-apply">
              <span class="sb-link-icon"><i data-lucide="file-plus"></i></span>
              <span class="sb-link-text">Apply Loan</span>
            </a>
          </li>
          <li class="sb-item">
            <a class="sb-link sb-sub-link" href="#" data-page="loan-status">
              <span class="sb-link-icon"><i data-lucide="clock"></i></span>
              <span class="sb-link-text">Loan Status</span>
            </a>
          </li>
        </ul>
      </li>

      <!-- Registration Approval -->
      <li class="sb-item">
        <a class="sb-link" href="#" data-page="registration-approval">
          <span class="sb-link-icon"><i data-lucide="user-check"></i></span>
          <span class="sb-link-text">Registration Approval</span>
        </a>
      </li>

    </ul>
  </nav>
</aside>
<div class="sb-overlay" id="sbOverlay"></div>
`;

  /* ── 2. Wrap body content in shell ── */
  const shell = document.createElement('div');
  shell.className = 'portal-shell';

  const main = document.createElement('div');
  main.className = 'portal-main';
  main.id = 'portalMain';

  // Move all existing body children into .portal-main
  const children = Array.from(document.body.childNodes);
  children.forEach(child => main.appendChild(child));

  shell.innerHTML = sidebarHTML;
  shell.appendChild(main);
  document.body.appendChild(shell);

  /* ── 3. Run Lucide icons NOW (sidebar just injected) ── */
  function runLucide() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }
  runLucide();

  /* ── 4. Active link detection ── */
  const page = window.location.pathname.split('/').pop().split('?')[0];
  const matchMap = {
    'home.html':        'home',
    'draw-select.html': 'home',
    'loading.html':     'home',
    'winners.html':     'home',
    'eligibility.html': 'eligibility',
    'blacklist.html':   'blacklist',
  };
  const activePage = matchMap[page] || page;

  shell.querySelectorAll('.sb-link[data-page]').forEach(link => {
    if (link.getAttribute('data-page') === activePage) {
      link.classList.add('active');
      // Auto-open parent group if it is a sub-link
      const parentItem   = link.closest('.sb-item');
      const grandParent  = parentItem?.parentElement?.closest('.sb-item');
      if (grandParent) {
        grandParent.classList.add('open');
        const parentLink = grandParent.querySelector(':scope > .sb-link');
        if (parentLink) parentLink.setAttribute('aria-expanded', 'true');
      }
    }
  });

  /* ── 5. Sidebar collapse / expand ── */
  const sidebar   = document.getElementById('portalSidebar');
  const mainEl    = document.getElementById('portalMain');
  const toggleBtn = document.getElementById('sbToggle');
  const overlay   = document.getElementById('sbOverlay');
  const STORE_KEY = 'mpesa_sb_collapsed';

  function isMobile() { return window.innerWidth <= 860; }

  // Restore persisted collapsed state on desktop
  if (!isMobile() && localStorage.getItem(STORE_KEY) === '1') {
    sidebar.classList.add('collapsed');
    mainEl.classList.add('sidebar-collapsed');
  }

  toggleBtn.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('open');
    } else {
      sidebar.classList.toggle('collapsed');
      mainEl.classList.toggle('sidebar-collapsed');
      localStorage.setItem(STORE_KEY, sidebar.classList.contains('collapsed') ? '1' : '0');
    }
  });

  /* ── 6. Sub-menu expand / collapse ── */
  shell.querySelectorAll('.sb-has-sub').forEach(link => {
    link.addEventListener('click', () => {
      if (sidebar.classList.contains('collapsed') && !isMobile()) return;
      const item   = link.parentElement;
      const isOpen = item.classList.contains('open');
      // Close all open groups first
      shell.querySelectorAll('.sb-item.open').forEach(i => {
        i.classList.remove('open');
        const l = i.querySelector(':scope > .sb-link');
        if (l) l.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        link.setAttribute('aria-expanded', 'true');
      }
    });
    link.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); link.click(); }
    });
  });

  /* ── 7. Mobile hamburger in topbar ── */
  const topbar = document.querySelector('.portal-topbar');
  if (topbar) {
    const mobileBtn = document.createElement('button');
    mobileBtn.className = 'sb-mobile-toggle';
    mobileBtn.setAttribute('aria-label', 'Open navigation');
    mobileBtn.innerHTML = `<i data-lucide="menu"></i>`;
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('open');
    });
    topbar.insertBefore(mobileBtn, topbar.firstChild);
    runLucide(); // render the new hamburger icon
  }

  /* ── 8. Overlay closes mobile sidebar ── */
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('open');
  });

})();
