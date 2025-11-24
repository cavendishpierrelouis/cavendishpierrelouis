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
     2) DYNAMIC YEAR (for footer)
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
     4) TYPEWRITER UTILITY
     ================================== */
  function typeWriter(el, text, options) {
    const {
      speed = 32,
      delay = 0,
      onceKey,
      onComplete
    } = options || {};

    if (!el || !text) return;

    // For "run only once" cases (hero)
    if (onceKey && el.dataset[onceKey] === '1') return;

    el.textContent = '';
    let i = 0;

    function step() {
      el.textContent += text.charAt(i);
      i += 1;
      if (i < text.length) {
        setTimeout(step, speed);
      } else {
        if (onceKey) {
          el.dataset[onceKey] = '1';
        }
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    }

    setTimeout(step, delay);
  }


  /* ==================================
     5) HERO TYPEWRITER (home + privacy)
        → runs once per page load
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
        onceKey: 'heroTyped' // only once per page load
      });
    });
  })();


  /* ==================================
     6) SECTION REVEAL + REPEATING TITLE
        ANIMATIONS ON SCROLL
     ================================== */
  (function setupSectionReveal() {
    const sections = document.querySelectorAll('.section');
    if (!sections.length) return;

    // Store original heading text once
    sections.forEach((section) => {
      const heading = section.querySelector('h2, h3');
      if (heading) {
        heading.dataset.fullText = heading.textContent.trim();
      }
    });

    // Fallback: show everything if no IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      sections.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const section = entry.target;
          const heading = section.querySelector('h2, h3');

          if (entry.isIntersecting) {
            // Fade/slide in every time it comes into view
            section.classList.add('is-in');

            // Re-type the section heading EVERY TIME it re-enters view
            if (heading && heading.dataset.fullText) {
              // avoid double-starting while it's already typing
              if (heading.dataset.animating === '1') return;

              heading.dataset.animating = '1';

              typeWriter(heading, heading.dataset.fullText, {
                speed: 26,
                delay: 60,
                onComplete() {
                  heading.dataset.animating = '0';
                }
              });
            }

            // Extra hook for the "Engineering the modern web" panel
            if (section.id === 'craft') {
              const panel = section.querySelector('.craft-panel');
              if (panel) {
                panel.classList.add('is-live');
              }
            }
          } else {
            // Fade/slide OUT when leaving view, so it can animate again later
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

    sections.forEach((section) => observer.observe(section));
  })();
})();
