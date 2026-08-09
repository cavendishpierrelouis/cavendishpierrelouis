'use strict';

(function setupCustomCursor() {
  const supportsCustomCursor = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  ).matches;
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (!supportsCustomCursor || reducedMotion) return;

  const cursor = document.querySelector('.custom-cursor');
  const follower = document.querySelector('.custom-cursor-follower');

  if (!cursor || !follower) return;

  let mouseX = -100;
  let mouseY = -100;
  let followerX = -100;
  let followerY = -100;
  let hasMoved = false;

  function positionElement(element, x, y) {
    element.style.transform =
      `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }

  function animateFollower() {
    followerX += (mouseX - followerX) / 4;
    followerY += (mouseY - followerY) / 4;
    positionElement(follower, followerX, followerY);
    window.requestAnimationFrame(animateFollower);
  }

  function showCursor() {
    cursor.classList.add('is-visible');
    follower.classList.add('is-visible');
  }

  function hideCursor() {
    cursor.classList.remove('is-visible');
    follower.classList.remove('is-visible');
  }

  function isOrangeContext(element) {
    if (element && element.closest('.site-header')) {
      return true;
    }

    const primaryButton = element && element.closest(
      '.button, .contact-overview__button, .contact-form__submit'
    );

    if (primaryButton && primaryButton.matches(':hover')) {
      return true;
    }

    let current = element;

    while (current && current !== document.documentElement) {
      const styles = window.getComputedStyle(current);
      const colors = [styles.backgroundColor, styles.color];

      if (colors.some(function (color) {
        const channels = color.match(/\d+(?:\.\d+)?/g);
        if (!channels || channels.length < 3) return false;
        const [red, green, blue] = channels.map(Number);
        return red >= 235 && red <= 255 && green >= 60 && green <= 90 && blue <= 50;
      })) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  function updateCursorContrast(element) {
    const onOrange = isOrangeContext(element);
    cursor.classList.toggle('is-on-orange', onOrange);
    follower.classList.toggle('is-on-orange', onOrange);
  }

  function setupBookingCard() {
    const card = document.querySelector('.booking-card');
    const openers = document.querySelectorAll('[data-booking-open]');
    const closeButton = card && card.querySelector('[data-booking-close]');

    if (!card || !openers.length || !closeButton) return;

    function closeBooking() {
      card.hidden = true;
      document.body.classList.remove('booking-open');
    }

    openers.forEach(function (opener) {
      opener.addEventListener('click', function (event) {
        event.preventDefault();
        card.hidden = false;
        document.body.classList.add('booking-open');
        closeButton.focus({ preventScroll: true });
      });
    });

    closeButton.addEventListener('click', closeBooking);

    card.addEventListener('click', function (event) {
      if (event.target === card) closeBooking();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !card.hidden) closeBooking();
    });
  }

  setupBookingCard();

  document.addEventListener('pointermove', function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
    positionElement(cursor, mouseX, mouseY);
    updateCursorContrast(document.elementFromPoint(mouseX, mouseY));

    if (!hasMoved) {
      followerX = mouseX;
      followerY = mouseY;
      hasMoved = true;
    }

    showCursor();
  }, { passive: true });

  document.addEventListener('pointerleave', hideCursor);
  document.addEventListener('pointerenter', function () {
    if (hasMoved) showCursor();
  });

  const interactiveSelector = [
    'a', 'button', 'input', 'textarea', 'select', 'label',
    '[role="button"]', '[data-cursor-hover]'
  ].join(',');

  document.addEventListener('pointerover', function (event) {
    updateCursorContrast(event.target);
    if (!event.target.closest(interactiveSelector)) return;
    cursor.classList.add('is-hovering');
    follower.classList.add('is-hovering');
  });

  document.addEventListener('pointerout', function (event) {
    const interactiveElement = event.target.closest(interactiveSelector);
    if (!interactiveElement) return;

    if (event.relatedTarget && interactiveElement.contains(event.relatedTarget)) {
      return;
    }

    cursor.classList.remove('is-hovering');
    follower.classList.remove('is-hovering');
  });

  document.addEventListener('pointerdown', function () {
    cursor.classList.add('is-pressed');
    follower.classList.add('is-pressed');
  });

  document.addEventListener('pointerup', function () {
    cursor.classList.remove('is-pressed');
    follower.classList.remove('is-pressed');
  });

  animateFollower();
}());

(function setupTheme() {
  const root = document.documentElement;
  const toggle = document.querySelector('[data-theme-toggle]');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  if (!toggle) return;

  function applyTheme(theme, persist) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = nextTheme;

    toggle.setAttribute(
      'aria-label',
      nextTheme === 'dark' ? 'Light mode' : 'Dark mode'
    );

    toggle.title = nextTheme === 'dark'
      ? 'Light mode'
      : 'Dark mode';

    if (themeMeta) {
      themeMeta.setAttribute(
        'content',
        nextTheme === 'dark' ? '#161616' : '#FEF8E8'
      );
    }

    if (persist) {
      try {
        localStorage.setItem('cmpl-theme', nextTheme);
      } catch (error) {
        /*
          The theme still changes when browser storage is unavailable.
        */
      }
    }
  }

  applyTheme(root.dataset.theme || 'light', false);

  toggle.addEventListener('click', function () {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme, true);
  });

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

  systemTheme.addEventListener('change', function (event) {
    try {
      if (localStorage.getItem('cmpl-theme')) return;
    } catch (error) {
      /*
        Continue with the operating-system theme when storage is unavailable.
      */
    }

    applyTheme(event.matches ? 'dark' : 'light', false);
  });
}());

(function setupMenu() {
  const menu = document.querySelector('[data-menu]');
  const openButton = document.querySelector('[data-menu-open]');
  const closeButton = document.querySelector('[data-menu-close]');

  if (!menu || !openButton || !closeButton) return;

  const menuLinks = menu.querySelectorAll('a');

  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    openButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    closeButton.focus();
  }

  function closeMenu(returnFocus) {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    openButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');

    if (returnFocus) {
      openButton.focus();
    }
  }

  openButton.addEventListener('click', openMenu);

  closeButton.addEventListener('click', function () {
    closeMenu(true);
  });

  menuLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      closeMenu(false);
    });
  });

  menu.addEventListener('click', function (event) {
    if (event.target === menu) {
      closeMenu(true);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu(true);
    }
  });
}());

(function setupHeader() {
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('.hero');
  const orangeSections = Array.from(
    document.querySelectorAll('[data-header-tone="orange"]')
  );

  if (!header) return;

  let ticking = false;

  function updateHeader() {
    const headerHeight = header.offsetHeight || 72;
    const sampleY = Math.max(1, headerHeight * 0.55);

    header.classList.toggle('is-scrolled', window.scrollY > 24);

    if (hero) {
      const heroRect = hero.getBoundingClientRect();
      const headerIsOverHero =
        heroRect.top <= sampleY &&
        heroRect.bottom > sampleY;

      header.classList.toggle('is-over-hero', headerIsOverHero);
    } else {
      header.classList.remove('is-over-hero');
    }

    const headerIsOverOrange = orangeSections.some(function (section) {
      const rect = section.getBoundingClientRect();
      return rect.top <= sampleY && rect.bottom > sampleY;
    });

    header.classList.toggle('is-over-orange', headerIsOverOrange);
    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateHeader);
  }

  updateHeader();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
}());

(function setupActiveNavigation() {
  const links = Array.from(
    document.querySelectorAll('.desktop-nav a[href^="#"]')
  );

  if (!links.length || !('IntersectionObserver' in window)) return;

  const sections = links
    .map(function (link) {
      return document.querySelector(link.getAttribute('href'));
    })
    .filter(Boolean);

  const observer = new IntersectionObserver(
    function (entries) {
      const visible = entries
        .filter(function (entry) {
          return entry.isIntersecting;
        })
        .sort(function (a, b) {
          return b.intersectionRatio - a.intersectionRatio;
        })[0];

      if (!visible) return;

      links.forEach(function (link) {
        link.classList.toggle(
          'is-active',
          link.getAttribute('href') === '#' + visible.target.id
        );
      });
    },
    {
      rootMargin: '-30% 0px -55% 0px',
      threshold: [0.01, 0.15, 0.35]
    }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
}());

(function setupCookiePreferences() {
  const storageKey = 'cmpl-cookie-preferences';
  const cookiePolicyHref = window.location.pathname.includes('/cavendishpierrelouis/')
    ? '/cavendishpierrelouis/legal.html#cookies-policy'
    : '/legal.html#cookies-policy';

  function readPreferences() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch (error) {
      return {};
    }
  }

  function hasSavedPreferences() {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch (error) {
      return false;
    }
  }

  function savePreferences(preferences) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch (error) {}
  }

  function createConsentNotice() {
    document.body.insertAdjacentHTML('beforeend', `
      <aside class="cookie-consent" data-cookie-consent aria-labelledby="cookie-consent-title">
        <span class="cookie-consent__accent" aria-hidden="true"></span>
        <h2 id="cookie-consent-title">Cookies</h2>
        <p>This website uses required cookies to function. Optional analytics cookies help me understand how the site is used.</p>
        <div class="cookie-consent__actions">
          <button class="cookie-consent__preferences" type="button" data-cookie-consent-preferences>Manage preferences</button>
          <button class="cookie-consent__accept" type="button" data-cookie-consent-accept>Accept optional cookies</button>
        </div>
      </aside>
    `);
    return document.querySelector('[data-cookie-consent]');
  }

  function createModal() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="cookie-modal" data-cookie-modal hidden>
        <div class="cookie-modal__backdrop" data-close-cookie-modal></div>
        <section class="cookie-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="site-cookie-modal-title">
          <header>
            <h2 id="site-cookie-modal-title">Manage cookie preferences</h2>
            <button class="cookie-modal__close" type="button" data-close-cookie-modal aria-label="Close cookie preferences">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </button>
          </header>
          <div class="cookie-modal__body">
            <p><a href="https://cavendishpierrelouis.io">cavendishpierrelouis.io</a> uses cookies to keep the website working and understand how it is used.</p>
            <p>Required cookies are always on. You can choose whether to allow optional cookies below. You can change your choices at any time.</p>
            <p>For more information, read the <a href="${cookiePolicyHref}">Cookies Policy</a>.</p>
            <div class="cookie-choice"><div><h3>Required</h3><p>Required cookies help the website function, remember your privacy choices, and support security. They cannot be turned off.</p></div><span class="cookie-choice__status">Always on</span></div>
            <label class="cookie-choice"><span><h3>Analytics</h3><p>Analytics cookies help me understand how people use the website, including which pages are visited and how the site performs. They are only used with your permission.</p></span><input type="checkbox" data-cookie-category="analytics"><span class="cookie-switch" aria-hidden="true"></span></label>
            <label class="cookie-choice"><span><h3>Social media</h3><p>Social media cookies may be used when the website includes content or features from social platforms. They are only used with your permission.</p></span><input type="checkbox" data-cookie-category="social"><span class="cookie-switch" aria-hidden="true"></span></label>
            <label class="cookie-choice"><span><h3>Advertising</h3><p>Advertising cookies may be used to measure advertising and understand whether a campaign led someone to the website. They are only used with your permission.</p></span><input type="checkbox" data-cookie-category="advertising"><span class="cookie-switch" aria-hidden="true"></span></label>
          </div>
          <footer><button class="cookie-modal__reset" type="button" data-reset-cookie-preferences>Reset all</button><button class="cookie-modal__save" type="button" data-save-cookie-preferences>Save changes</button></footer>
        </section>
      </div>
    `);
    return document.querySelector('[data-cookie-modal]');
  }

  const modal = document.querySelector('[data-cookie-modal]') || createModal();
  if (!modal) return;

  const inputs = Array.from(modal.querySelectorAll('[data-cookie-category]'));
  const consentNotice = document.querySelector('[data-cookie-consent]') || (
    hasSavedPreferences() ? null : createConsentNotice()
  );

  function hideConsentNotice() {
    if (!consentNotice || consentNotice.hidden) return;
    consentNotice.classList.remove('is-visible');
    window.setTimeout(function () {
      consentNotice.hidden = true;
    }, 220);
  }

  if (consentNotice && !consentNotice.hidden) {
    window.requestAnimationFrame(function () {
      consentNotice.classList.add('is-visible');
    });
  }

  function syncPreferences() {
    const preferences = readPreferences();

    inputs.forEach(function (input) {
      if (Object.prototype.hasOwnProperty.call(preferences, input.dataset.cookieCategory)) {
        input.checked = Boolean(preferences[input.dataset.cookieCategory]);
      }
    });
  }

  function openModal(event) {
    if (event) event.preventDefault();
    syncPreferences();
    modal.hidden = false;
    document.body.classList.add('cookie-modal-open');
    modal.querySelector('[data-close-cookie-modal]')?.focus({ preventScroll: true });
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('cookie-modal-open');
  }

  document.querySelectorAll('[data-open-cookie-preferences]').forEach(function (control) {
    control.addEventListener('click', openModal);
  });

  modal.querySelectorAll('[data-close-cookie-modal]').forEach(function (control) {
    control.addEventListener('click', closeModal);
  });

  modal.querySelector('[data-reset-cookie-preferences]')?.addEventListener('click', function () {
    inputs.forEach(function (input) { input.checked = false; });
  });

  modal.querySelector('[data-save-cookie-preferences]')?.addEventListener('click', function () {
    const preferences = {};
    inputs.forEach(function (input) {
      preferences[input.dataset.cookieCategory] = input.checked;
    });
    savePreferences(preferences);
    hideConsentNotice();
    closeModal();
  });

  consentNotice?.querySelector('[data-cookie-consent-preferences]')?.addEventListener('click', openModal);

  consentNotice?.querySelector('[data-cookie-consent-accept]')?.addEventListener('click', function () {
    const preferences = {};
    inputs.forEach(function (input) {
      input.checked = true;
      preferences[input.dataset.cookieCategory] = true;
    });
    savePreferences(preferences);
    hideConsentNotice();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
}());
