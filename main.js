// main.js — smooth scroll animations, no typewriter
(function () {
  'use strict';

  /* ============================
     1) DATE + TIME (Los Angeles)
     ============================ */
  (function setupClock() {
    const dateEl = document.getElementById('date');
    const clockEl = document.getElementById('clock');
    if (!dateEl || !clockEl) return; // privacy page or future page might not have them

    const tz = 'America/Los_Angeles';

    function tick() {
      const now = new Date();

      // Date: MM/DD/YYYY
      const dateFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      dateEl.textContent = dateFmt.format(now);

      // Time: 24h HH:MM:SS
      const timeFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      clockEl.textContent = timeFmt.format(now);
    }

    tick();
    setInterval(tick, 1000);
  })();


  /* ============================
     2) DYNAMIC YEAR (for footer)
     ============================ */
  (function setupYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  })();


  /* ============================
     3) LEFT DRAWER NAV
        (Home + Privacy)
     ============================ */
  (function setupDrawerNav() {
    const btn = document.getElementById('menuToggle');
    const panel = document.getElementById('menuPanel');
    const overlay = document.getElementById('navOverlay');

    // On privacy.html there is no #menuToggle anymore, so bail out gracefully
    if (!btn || !panel || !overlay) return;

    function openMenu() {
      panel.classList.add('open');
      overlay.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', 'false');
    }

    function closeMenu() {
      panel.classList.remove('open');
      overlay.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
    }

    function toggleMenu() {
      if (panel.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    btn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    // If viewport resizes, close the drawer to avoid weird states
    window.addEventListener('resize', closeMenu);

    // Expose for inline onclick="closeMenu()" in your links
    window.closeMenu = closeMenu;
  })();


  /* ============================
     4) SMOOTH SCROLL ANIMATIONS
        (Sections + pagehead +
         anything marked with
         .js-type-on-scroll)
     ============================ */
  (function setupScrollAnimations() {
    // Every element that should fade / slide on scroll
    const animatedEls = document.querySelectorAll(
      '.section, .pagehead, .js-type-on-scroll'
    );

    if (!animatedEls.length) return;

    // Fallback for very old browsers: just show everything
    if (!('IntersectionObserver' in window)) {
      animatedEls.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;

          if (entry.isIntersecting) {
            // Element came into view: add "is-in" to trigger CSS transitions
            el.classList.add('is-in');
          } else {
            // Element left the viewport: remove "is-in"
            // so it can animate again when you scroll back
            el.classList.remove('is-in');
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.25
      }
    );

    animatedEls.forEach((el) => observer.observe(el));
  })();

})();
