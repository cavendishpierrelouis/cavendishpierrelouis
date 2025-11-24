// scripts/main.js
(function () {
  'use strict';

  /* ==================================
     1) DATE + TIME (Los Angeles)
     ================================== */
  (function setupClock() {
    const dateEl = document.getElementById('date');
    const clockEl = document.getElementById('clock');
    if (!dateEl || !clockEl) return;

    const tz = 'America/Los_Angeles';

    function tick() {
      const now = new Date();

      const dateFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      dateEl.textContent = dateFmt.format(now);

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


  /* ==================================
     2) DYNAMIC YEAR (if you ever add it)
     ================================== */
  (function setupYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  })();


  /* ==================================
     3) LEFT DRAWER NAV (index only)
     ================================== */
  (function setupDrawerNav() {
    const btn = document.getElementById('menuToggle');
    const panel = document.getElementById('menuPanel');
    const overlay = document.getElementById('navOverlay');

    // privacy.html has no #menuToggle, so bail quietly
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
    window.addEventListener('resize', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    // expose for inline onclick="closeMenu()"
    window.closeMenu = closeMenu;
  })();


  /* ==================================
     4) TYPEWRITER UTIL (hero + sections)
     ================================== */
  function typeWriter(el, text, options) {
    const { speed = 32, delay = 0, onceKey } = options || {};

    if (!el || !text) return;

    // Avoid re-running when we only want it once
    if (onceKey && el.dataset[onceKey] === '1') return;

    el.textContent = '';
    let i = 0;

    function step() {
      el.textContent += text.charAt(i);
      i += 1;
      if (i < text.length) {
        setTimeout(step, speed);
      } else if (onceKey) {
        el.dataset[onceKey] = '1';
      }
    }

    setTimeout(step, delay);
  }


  /* ==================================
     5) HERO TYPEWRITER (home + privacy)
     ================================== */
  (function setupHeroTypewriter() {
    const headers = document.querySelectorAll(
      '.pagehead .title, .pagehead .subtitle'
    );
    if (!headers.length) return;

    headers.forEach((el, index) => {
      const text = el.textContent.trim();
      if (!text) return;

      typeWriter(el, text, {
        speed: 32,
        delay: 180 + index * 260,
        onceKey: 'heroTyped'
      });
    });
  })();


  /* ==================================
     6) SECTION REVEAL + TITLE ANIMATIONS
     ================================== */
  (function setupSectionReveal() {
    const sections = document.querySelectorAll('.section');
    if (!sections.length) return;

    // If browser doesn't support IntersectionObserver, just show
    if (!('IntersectionObserver' in window)) {
      sections.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const section = entry.target;

          if (entry.isIntersecting) {
            section.classList.add('is-in');

            // 6a) Section title typewriter (first time only per heading)
            const heading = section.querySelector('h2, h3');
            if (heading && !heading.dataset.sectionTyped) {
              const original = heading.textContent.trim();
              typeWriter(heading, original, {
                speed: 26,
                delay: 80,
                onceKey: 'sectionTyped'
              });
            }

            // 6b) Engineering pill extra activation
            if (section.id === 'craft') {
              const panel = section.querySelector('.craft-panel');
              if (panel) {
                panel.classList.add('is-live');
              }
            }
          } else {
            // Fade + slide again when we come back into view
            section.classList.remove('is-in');

            if (section.id === 'craft') {
              const panel = section.querySelector('.craft-panel');
              if (panel) {
                panel.classList.remove('is-live');
              }
            }
          }
        });
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.18
      }
    );

    sections.forEach((el) => observer.observe(el));
  })();
})();
