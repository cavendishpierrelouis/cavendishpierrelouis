// main.js — clock, nav, hero-mode, scroll reveals
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
     4) HERO MODE
        (logo center at top, about hidden)
     ============================ */
  (function setupHeroHeader() {
    const body = document.body;

    // Only run this on the home page
    if (!body.classList.contains('home-page')) return;

    function updateHeroMode() {
      // When scrolled even a little bit, turn hero-mode OFF
      if (window.scrollY > 10) {
        body.classList.remove('hero-mode');
      } else {
        // At the very top, hero-mode ON
        body.classList.add('hero-mode');
      }
    }

    // Initial state + listener
    updateHeroMode();
    window.addEventListener('scroll', updateHeroMode, { passive: true });
  })();


  /* ============================
     5) SCROLL REVEAL ANIMATIONS
        (.section + .js-type-on-scroll)
     ============================ */
  (function setupScrollAnimations() {
    // All elements that should fade / slide on scroll
    const animatedEls = document.querySelectorAll(
      '.section, .js-type-on-scroll'
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
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
          } else {
            entry.target.classList.remove('is-in');
          }
        });
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.12
      }
    );

    animatedEls.forEach((el) => observer.observe(el));
  })();
 
/* ============================================================
   HERO INTRO — Apple smooth scroll threshold
   ============================================================ */
(function setupHeroIntro() {
  const body = document.body;
  const header = document.querySelector('header.pagehead');
  const about = document.getElementById('about');

  if (!header || !about) return;

  function updateHeroState() {
    const y = window.scrollY;

    // threshold 1: immediate but not jittery
    if (y > 70) {
      body.classList.remove('hero-intro');
    } else {
      body.classList.add('hero-intro');
    }
  }

  // initial state on load
  body.classList.add('hero-intro');
  updateHeroState();

  window.addEventListener('scroll', updateHeroState, { passive: true });
})();



})();
