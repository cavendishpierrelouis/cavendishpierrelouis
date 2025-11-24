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
     2) DYNAMIC YEAR (for footer, optional)
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
     4) BASIC TYPEWRITER UTILITY
     ================================== */
  function typeWriter(el, text, speed, delay) {
    if (!el || !text) return;

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


  /* ==================================
     5) HERO TYPEWRITER (runs on load)
     ================================== */
  (function setupHeroTypewriter() {
    const headers = document.querySelectorAll(
      '.pagehead .title, .pagehead .subtitle'
    );
    if (!headers.length) return;

    // Respect prefers-reduced-motion
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; // leave text static
    }

    headers.forEach((el, index) => {
      const text = el.textContent.trim();
      if (!text) return;

      typeWriter(el, text, 32, 180 + index * 260);
    });
  })();


  /* ==================================
     6) SECTION REVEAL + TITLE TYPE ON SCROLL
        (replays every time you scroll away
         and back into the section)
     ================================== */
  (function setupSectionReveal() {
    const sections = document.querySelectorAll('.section');
    if (!sections.length) return;

    // Store original heading text once per section
    sections.forEach((section) => {
      const heading = section.querySelector('h2, h3');
      if (heading && !heading.dataset.fullText) {
        heading.dataset.fullText = heading.textContent.trim();
      }
    });

    // Old browsers: just show everything, no animation
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
            // Fade / slide the whole section in
            section.classList.add('is-in');

            // Respect reduced motion
            if (window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
              return;
            }

            // Type the heading each time the section becomes visible
            if (heading && heading.dataset.fullText) {
              typeWriter(heading, heading.dataset.fullText, 26, 60);
            }

            // Extra state for the engineering pill
            if (section.id === 'craft') {
              const panel = section.querySelector('.craft-panel');
              if (panel) panel.classList.add('is-live');
            }
          } else {
            // Remove .is-in so the fade re-triggers next time
            section.classList.remove('is-in');

            // Allow the craft panel extra class to reset too
            if (section.id === 'craft') {
              const panel = section.querySelector('.craft-panel');
              if (panel) panel.classList.remove('is-live');
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
