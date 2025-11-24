// scripts/main.js
(function () {
  'use strict';

  /* ============================
     1) DATE + TIME (Los Angeles)
     ============================ */
  (function setupClock() {
    const dateEl = document.getElementById('date');
    const clockEl = document.getElementById('clock');
    if (!dateEl || !clockEl) return; // some pages might not have them

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
        (Home page only – privacy
         page has just the home icon)
     ============================ */
  (function setupDrawerNav() {
    const btn = document.getElementById('menuToggle');
    const panel = document.getElementById('menuPanel');
    const overlay = document.getElementById('navOverlay');

    // On privacy.html there is no #menuToggle, so bail out gracefully
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
     4) SECTION REVEAL ON SCROLL
        (Always animates on enter)
     ============================ */
  (function setupSectionReveal() {
    const sections = document.querySelectorAll('.section');
    if (!sections.length) return;

    // Old browsers: just show everything
    if (!('IntersectionObserver' in window)) {
      sections.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When section enters the viewport -> add class (fade in)
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
          } else {
            // When section leaves the viewport -> remove class
            // so it can fade in AGAIN when you scroll back
            entry.target.classList.remove('is-in');
          }
        });
      },
      {
        rootMargin: '0px 0px -15% 0px',
        threshold: 0.18
      }
    );

    sections.forEach((el) => observer.observe(el));
  })();


  /* ============================
     5) HERO TYPEWRITER TITLES
        (Home + Privacy)
     ============================ */
  (function setupHeroTypewriter() {
    // All pagehead titles & subtitles get the effect
    const headers = document.querySelectorAll('.pagehead .title, .pagehead .subtitle');
    if (!headers.length) return;

    function typeWriter(el, text, speed, delay) {
      let i = 0;
      el.textContent = '';

      function step() {
        el.textContent += text.charAt(i);
        i += 1;

        if (i < text.length) {
          setTimeout(step, speed);
        }
      }

      setTimeout(step, delay);
    }

    headers.forEach((el, index) => {
      const text = el.textContent.trim();
      if (!text) return;

      const baseSpeed = 32;         // typing speed in ms per letter
      const initialDelay = 180;     // delay before first header
      const staggerDelay = 260;     // added delay per header (title, then subtitle)

      typeWriter(
        el,
        text,
        baseSpeed,
        initialDelay + index * staggerDelay
      );
    });
  })();
})();
