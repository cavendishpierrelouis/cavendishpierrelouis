'use strict';

(function setupCustomCursor() {
  if (window.__cmplCustomCursorInitialized) return;

  const supportsCustomCursor = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  ).matches;
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (!supportsCustomCursor || reducedMotion) return;

  const cursor = document.querySelector('.custom-cursor');
  const follower = document.querySelector('.custom-cursor-follower');
  const header = document.querySelector('[data-header]');
  const homeHeroVisual = document.querySelector('.home-page .hero__visual');

  if (!cursor || !follower) return;

  window.__cmplCustomCursorInitialized = true;

  const root = document.documentElement;
  const interactiveSelector = [
    'a', 'button', 'input', 'textarea', 'select', 'label',
    '[role="button"]', '[data-cursor-hover]'
  ].join(',');
  const primaryCursorSelector = [
    '.button', '.contact-overview__button', '.contact-form__submit'
  ].join(',');
  const followerEasing = 0.25;
  const followerRestDistance = 0.25;

  let mouseX = -100;
  let mouseY = -100;
  let followerX = -100;
  let followerY = -100;
  let hasMoved = false;
  let pointerInside = false;
  let cursorFrame = 0;
  let boundsFrame = 0;
  let cursorPositionDirty = false;
  let followerPositionDirty = false;
  let contrastDirty = false;
  let contrastTarget = null;
  let orangeContext = false;
  let isVisible = false;
  let isHovering = false;
  let isPressed = false;
  let isOnOrange = false;
  let customCursorActive = false;
  let hoveredInteractive = null;
  let headerBounds = null;
  let heroVisualBounds = null;

  function positionElement(element, x, y) {
    element.style.transform =
      `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }

  function getElement(target) {
    return target instanceof Element ? target : null;
  }

  function setVisible(visible) {
    if (isVisible === visible) return;

    isVisible = visible;
    cursor.classList.toggle('is-visible', visible);
    follower.classList.toggle('is-visible', visible);
  }

  function setHovering(hovering) {
    if (isHovering === hovering) return;

    isHovering = hovering;
    cursor.classList.toggle('is-hovering', hovering);
    follower.classList.toggle('is-hovering', hovering);
  }

  function setPressed(pressed) {
    if (isPressed === pressed) return;

    isPressed = pressed;
    cursor.classList.toggle('is-pressed', pressed);
    follower.classList.toggle('is-pressed', pressed);
  }

  function setOnOrange(onOrange) {
    if (isOnOrange === onOrange) return;

    isOnOrange = onOrange;
    cursor.classList.toggle('is-on-orange', onOrange);
    follower.classList.toggle('is-on-orange', onOrange);
  }

  function queueContrastTarget(target) {
    const element = getElement(target);

    if (contrastTarget === element) return;

    contrastTarget = element;
    contrastDirty = true;
  }

  function isOrangeContext(element) {
    const primaryButton = element && element.closest(primaryCursorSelector);

    if (primaryButton) {
      return true;
    }

    let current = element;

    while (current && current !== document.documentElement) {
      const styles = window.getComputedStyle(current);
      const colors = [styles.backgroundColor];

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

  function pointIsInsideBounds(x, y, bounds) {
    return Boolean(
      bounds &&
      x >= bounds.left &&
      x <= bounds.right &&
      y >= bounds.top &&
      y <= bounds.bottom
    );
  }

  function updateHomeHeroBounds() {
    boundsFrame = 0;

    if (!header || !homeHeroVisual) return;

    headerBounds = header.getBoundingClientRect();
    heroVisualBounds = homeHeroVisual.getBoundingClientRect();
    scheduleCursorFrame();
  }

  function scheduleHomeHeroBounds() {
    if (!header || !homeHeroVisual || boundsFrame) return;

    boundsFrame = window.requestAnimationFrame(updateHomeHeroBounds);
  }

  function isHomeHeroVisualBehindHeader(x, y) {
    if (
      !header ||
      !homeHeroVisual ||
      header.classList.contains('is-scrolled') ||
      !headerBounds ||
      !heroVisualBounds
    ) {
      return false;
    }

    return pointIsInsideBounds(x, y, headerBounds) &&
      pointIsInsideBounds(x, y, heroVisualBounds);
  }

  function updateCursorContrast() {
    if (contrastDirty) {
      orangeContext = isOrangeContext(contrastTarget);
      contrastDirty = false;
    }

    setOnOrange(
      isHomeHeroVisualBehindHeader(mouseX, mouseY) || orangeContext
    );
  }

  function cancelCursorFrame() {
    if (!cursorFrame) return;

    window.cancelAnimationFrame(cursorFrame);
    cursorFrame = 0;
  }

  function scheduleCursorFrame() {
    if (
      cursorFrame ||
      !hasMoved ||
      !pointerInside ||
      document.hidden
    ) {
      return;
    }

    cursorFrame = window.requestAnimationFrame(renderCursor);
  }

  function renderCursor() {
    cursorFrame = 0;

    if (!hasMoved || !pointerInside || document.hidden) return;

    if (cursorPositionDirty) {
      positionElement(cursor, mouseX, mouseY);
      cursorPositionDirty = false;
    }

    updateCursorContrast();

    const distanceX = mouseX - followerX;
    const distanceY = mouseY - followerY;
    const followerIsSettled =
      Math.abs(distanceX) <= followerRestDistance &&
      Math.abs(distanceY) <= followerRestDistance;

    if (followerPositionDirty || !followerIsSettled) {
      if (!followerIsSettled) {
        followerX += distanceX * followerEasing;
        followerY += distanceY * followerEasing;
      } else {
        followerX = mouseX;
        followerY = mouseY;
      }

      positionElement(follower, followerX, followerY);
      followerPositionDirty = false;
    }

    if (!customCursorActive) {
      setVisible(true);
      root.classList.add('has-custom-cursor');
      customCursorActive = true;
    }

    if (!followerIsSettled) scheduleCursorFrame();
  }

  function deactivateCursor() {
    cancelCursorFrame();
    pointerInside = false;
    hasMoved = false;
    cursorPositionDirty = false;
    followerPositionDirty = false;
    contrastDirty = false;
    contrastTarget = null;
    orangeContext = false;
    setVisible(false);
    setHovering(false);
    setPressed(false);
    setOnOrange(false);
    hoveredInteractive = null;
    root.classList.remove('has-custom-cursor');
    customCursorActive = false;
  }

  document.addEventListener('pointermove', function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
    pointerInside = true;
    cursorPositionDirty = true;
    queueContrastTarget(event.target);

    if (!hasMoved) {
      followerX = mouseX;
      followerY = mouseY;
      followerPositionDirty = true;
      hasMoved = true;
    }

    scheduleCursorFrame();
  }, { passive: true });

  document.addEventListener('pointerleave', function () {
    pointerInside = false;
    setVisible(false);
    cancelCursorFrame();
  });

  document.addEventListener('pointerenter', function () {
    pointerInside = true;
  });

  document.addEventListener('pointerover', function (event) {
    const target = getElement(event.target);
    const interactiveElement = target && target.closest(interactiveSelector);

    queueContrastTarget(target);

    if (hoveredInteractive !== interactiveElement) {
      hoveredInteractive = interactiveElement;
      setHovering(Boolean(interactiveElement));
    }

    scheduleCursorFrame();
  });

  document.addEventListener('pointerout', function (event) {
    const target = getElement(event.target);
    const interactiveElement = target && target.closest(interactiveSelector);
    const relatedTarget = getElement(event.relatedTarget);
    const nextInteractive = relatedTarget &&
      relatedTarget.closest(interactiveSelector);

    if (!interactiveElement || interactiveElement !== hoveredInteractive) {
      return;
    }

    if (nextInteractive === interactiveElement) return;

    hoveredInteractive = nextInteractive;
    setHovering(Boolean(nextInteractive));
    queueContrastTarget(relatedTarget);
    scheduleCursorFrame();
  });

  document.addEventListener('pointerdown', function () {
    setPressed(true);
  });

  document.addEventListener('pointerup', function () {
    setPressed(false);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) deactivateCursor();
  });

  window.addEventListener('blur', deactivateCursor);
  window.addEventListener('pagehide', deactivateCursor);

  if (header && homeHeroVisual) {
    scheduleHomeHeroBounds();
    window.addEventListener('resize', scheduleHomeHeroBounds, { passive: true });
    window.addEventListener('scroll', scheduleHomeHeroBounds, { passive: true });
  }
}());

(function setupBookingCard() {
  const card = document.querySelector('.booking-card');
  const closeButton = card && card.querySelector('[data-booking-close]');

  if (!card || !closeButton) return;

  function openBooking() {
    card.hidden = false;
    card.setAttribute('aria-hidden', 'false');
    card.scrollTop = 0;
    document.body.classList.add('booking-open');
    closeButton.focus({ preventScroll: true });
  }

  function closeBooking() {
    card.hidden = true;
    card.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('booking-open');
  }

  document.addEventListener('click', function (event) {
    const opener = event.target.closest(
      '[data-booking-open], a[href="#booking-card"]'
    );

    if (!opener) return;

    event.preventDefault();
    openBooking();
  });

  closeButton.addEventListener('click', closeBooking);

  card.addEventListener('click', function (event) {
    if (event.target === card) closeBooking();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !card.hidden) closeBooking();
  });
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

  applyTheme(root.dataset.theme || 'dark', false);

  toggle.addEventListener('click', function () {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme, true);
  });

  window.addEventListener('storage', function (event) {
    if (event.key !== 'cmpl-theme') return;

    applyTheme(
      event.newValue === 'light' ? 'light' : 'dark',
      false
    );
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
  const CONSENT_VERSION = 1;
  const CONSENT_COOKIE = 'cmpl_consent';
  const LEGACY_STORAGE_KEY = 'cmpl-cookie-preferences';
  const CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
  const OPTIONAL_CATEGORIES = ['analytics', 'social', 'advertising'];
  const root = document.documentElement;
  const sitePath = window.location.pathname.includes('/cavendishpierrelouis/')
    ? '/cavendishpierrelouis/'
    : '/';
  const configuredLegalUrl = root.dataset.cookieLegalUrl;
  const legalUrl = configuredLegalUrl || (sitePath + 'legal.html');
  const cookiePolicyHref = legalUrl + '#cookies-policy';
  const privacyPolicyHref = legalUrl + '#privacy-policy';
  let consentResolved = false;
  let consentTimer;
  let activeConsent;

  function createConsent(values) {
    const source = values || {};
    return {
      version: CONSENT_VERSION,
      required: true,
      analytics: Boolean(source.analytics),
      social: Boolean(source.social),
      advertising: Boolean(source.advertising),
      updatedAt: new Date().toISOString()
    };
  }

  function isValidConsent(value) {
    if (!value || value.version !== CONSENT_VERSION || value.required !== true) return false;

    if (OPTIONAL_CATEGORIES.some(function (category) {
      return typeof value[category] !== 'boolean';
    })) return false;

    return typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt));
  }

  function readCookie(name) {
    const prefix = name + '=';
    const cookie = document.cookie.split('; ').find(function (entry) {
      return entry.indexOf(prefix) === 0;
    });

    return cookie ? cookie.slice(prefix.length) : null;
  }

  function readConsent() {
    const encoded = readCookie(CONSENT_COOKIE);
    if (!encoded) return null;

    try {
      const parsed = JSON.parse(decodeURIComponent(encoded));
      return isValidConsent(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function usesSharedProductionCookie() {
    return window.location.protocol === 'https:'
      && /(^|\.)cavendishpierrelouis\.io$/i.test(window.location.hostname);
  }

  function writeConsent(consent) {
    const cookieParts = [
      CONSENT_COOKIE + '=' + encodeURIComponent(JSON.stringify(consent)),
      'Path=/',
      'Max-Age=' + CONSENT_MAX_AGE_SECONDS,
      'SameSite=Lax'
    ];

    if (usesSharedProductionCookie()) {
      cookieParts.push('Domain=cavendishpierrelouis.io', 'Secure');
    }

    document.cookie = cookieParts.join('; ');
  }

  function clearConsentCookie() {
    const cookieParts = [
      CONSENT_COOKIE + '=',
      'Path=/',
      'Max-Age=0',
      'SameSite=Lax'
    ];

    if (usesSharedProductionCookie()) {
      cookieParts.push('Domain=cavendishpierrelouis.io', 'Secure');
    }

    document.cookie = cookieParts.join('; ');
  }

  function removeLegacyPreferences() {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {}
  }

  function migrateLegacyPreferences() {
    // A malformed or version-mismatched cookie intentionally triggers a new
    // choice. Only migrate legacy storage when the shared cookie is absent.
    if (readCookie(CONSENT_COOKIE) || readConsent()) return null;

    let legacy;
    try {
      const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!saved) return null;
      legacy = JSON.parse(saved);
    } catch (error) {
      removeLegacyPreferences();
      return null;
    }

    const isValidLegacyPreferences = legacy
      && OPTIONAL_CATEGORIES.every(function (category) {
        return typeof legacy[category] === 'boolean';
      });

    removeLegacyPreferences();
    if (!isValidLegacyPreferences) return null;

    const migratedConsent = createConsent(legacy);
    writeConsent(migratedConsent);
    return readConsent() || migratedConsent;
  }

  function analyticsConfiguration() {
    return {
      googleMeasurementId: root.dataset.cmplGaId || '',
      cavbotProjectKey: root.dataset.cmplCavbotProjectKey || '',
      cavbotApi: root.dataset.cmplCavbotApi || ''
    };
  }

  function updateGoogleAnalyticsState(measurementId, allowed) {
    if (!measurementId) return;

    window['ga-disable-' + measurementId] = !allowed;
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: allowed ? 'granted' : 'denied'
      });
    }
  }

  function loadGoogleAnalytics(measurementId) {
    if (!measurementId || document.querySelector('[data-cmpl-google-analytics]')) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window['ga-disable-' + measurementId] = false;
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', measurementId);

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    script.dataset.cmplGoogleAnalytics = 'true';
    document.head.appendChild(script);
  }

  function loadCavbotAnalytics(projectKey, api) {
    if (!projectKey || document.querySelector('[data-cmpl-cavbot-analytics]')) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://cdn.cavbot.io/sdk/v5/cavai-analytics.min.js';
    script.dataset.cmplCavbotAnalytics = 'true';
    script.dataset.projectKey = projectKey;
    if (api) script.dataset.api = api;
    document.head.appendChild(script);
  }

  function applyConsent(consent) {
    const configuration = analyticsConfiguration();
    const analyticsAllowed = Boolean(consent && consent.analytics);

    root.dataset.cmplAnalyticsConsent = analyticsAllowed ? 'granted' : 'denied';
    window.CMPL_ANALYTICS_ALLOWED = analyticsAllowed;
    updateGoogleAnalyticsState(configuration.googleMeasurementId, analyticsAllowed);

    if (!analyticsAllowed) return;

    loadGoogleAnalytics(configuration.googleMeasurementId);
    loadCavbotAnalytics(configuration.cavbotProjectKey, configuration.cavbotApi);
  }

  function saveConsent(values) {
    const consent = createConsent(values);
    writeConsent(consent);
    activeConsent = readConsent() || consent;
    applyConsent(activeConsent);
    window.dispatchEvent(new CustomEvent('cmpl:consentchange', { detail: activeConsent }));
    return activeConsent;
  }

  function createConsentNotice() {
    document.body.insertAdjacentHTML('beforeend', `
      <aside class="cookie-consent" data-cookie-consent hidden aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-copy">
        <span class="cookie-consent__accent" aria-hidden="true"></span>
        <header class="cookie-consent__header">
          <h2 id="cookie-consent-title"><span>Cavendish uses cookies</span><span class="cookie-consent__icon cookie-consent__icon--cookies" aria-hidden="true"></span></h2>
          <a class="cookie-consent__overview" href="${privacyPolicyHref}" aria-label="Read the privacy policy">
            <span>Privacy</span>
          </a>
        </header>
        <div class="cookie-consent__copy" id="cookie-consent-copy">
          <p>This website uses cookies to remember your preferences, understand how the site is used, and improve performance. Some cookies are necessary for the website to function, while others help measure traffic and understand how visitors move through the site.</p>
          <p>You can accept all cookies, continue with essential cookies only, or choose which cookies you allow. Read the <a href="${cookiePolicyHref}">Cookie Policy</a> for more information and to update your preferences at any time.</p>
        </div>
        <div class="cookie-consent__actions">
          <button class="cookie-consent__customize" type="button" data-cookie-consent-preferences><span class="cookie-consent__icon cookie-consent__icon--settings" aria-hidden="true"></span><span>Customize</span></button>
          <button class="cookie-consent__essential" type="button" data-cookie-consent-essential>Essential only</button>
          <button class="cookie-consent__accept" type="button" data-cookie-consent-accept>Accept all</button>
        </div>
      </aside>
    `);
    return document.querySelector('[data-cookie-consent]');
  }

  function isCurrentConsentNotice(notice) {
    return Boolean(
      notice.querySelector('[data-cookie-consent-essential]')
      && notice.querySelector('[data-cookie-consent-preferences]')
      && notice.querySelector('[data-cookie-consent-accept]')
    );
  }

  function removeLegacyConsentNotices() {
    document.querySelectorAll('[data-cookie-consent]').forEach(function (notice) {
      if (!isCurrentConsentNotice(notice)) notice.remove();
    });
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
            <p>Functional cookies are always on. You can choose whether to allow optional cookies below. You can change your choices at any time.</p>
            <p>For more information, read the <a href="${cookiePolicyHref}">Cookies Policy</a>.</p>
            <div class="cookie-choice"><div><h3>Functional</h3><p>Functional cookies help the website function, remember your privacy choices, and support security. They cannot be turned off.</p></div><span class="cookie-choice__status">Always on</span></div>
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

  activeConsent = readConsent() || migrateLegacyPreferences();
  applyConsent(activeConsent);

  removeLegacyConsentNotices();

  const modal = document.querySelector('[data-cookie-modal]') || createModal();
  if (!modal) return;

  const inputs = Array.from(modal.querySelectorAll('[data-cookie-category]'));
  const consentNotice = document.querySelector('[data-cookie-consent]') || (
    activeConsent ? null : createConsentNotice()
  );

  function hideConsentNotice() {
    if (!consentNotice || consentNotice.hidden) return;
    consentResolved = true;
    window.clearTimeout(consentTimer);
    consentNotice.classList.remove('is-visible');
    document.body.classList.remove('cookie-consent-open');
    window.setTimeout(function () {
      consentNotice.hidden = true;
    }, 220);
  }

  function showConsentNotice() {
    if (!consentNotice || consentResolved || activeConsent || readConsent()) return;
    consentNotice.hidden = false;
    window.requestAnimationFrame(function () {
      consentNotice.classList.add('is-visible');
      document.body.classList.add('cookie-consent-open');
    });
  }

  if (consentNotice) {
    consentTimer = window.setTimeout(showConsentNotice, 3000);
  }

  function syncPreferences() {
    const preferences = activeConsent || readConsent() || createConsent();

    inputs.forEach(function (input) {
      if (Object.prototype.hasOwnProperty.call(preferences, input.dataset.cookieCategory)) {
        input.checked = Boolean(preferences[input.dataset.cookieCategory]);
      }
    });
  }

  function openModal(event) {
    if (event) event.preventDefault();
    syncPreferences();
    if (consentNotice && !consentNotice.hidden) {
      consentNotice.classList.remove('is-visible');
      document.body.classList.remove('cookie-consent-open');
    }
    modal.hidden = false;
    document.body.classList.add('cookie-modal-open');
    modal.querySelector('.cookie-modal__close')?.focus({ preventScroll: true });
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('cookie-modal-open');
    if (consentNotice && !consentNotice.hidden && !activeConsent && !readConsent()) {
      window.requestAnimationFrame(function () {
        consentNotice.classList.add('is-visible');
        document.body.classList.add('cookie-consent-open');
      });
    }
  }

  function clearConsent() {
    clearConsentCookie();
    activeConsent = null;
    consentResolved = false;
    applyConsent(null);
    syncPreferences();
    if (consentNotice) {
      consentNotice.classList.remove('is-visible');
      consentNotice.hidden = true;
      document.body.classList.remove('cookie-consent-open');
      window.clearTimeout(consentTimer);
      consentTimer = window.setTimeout(showConsentNotice, 3000);
    }
    window.dispatchEvent(new CustomEvent('cmpl:consentchange', { detail: null }));
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
    saveConsent(preferences);
    hideConsentNotice();
    closeModal();
  });

  consentNotice?.querySelector('[data-cookie-consent-preferences]')?.addEventListener('click', openModal);

  consentNotice?.querySelector('[data-cookie-consent-essential]')?.addEventListener('click', function () {
    const preferences = {};
    inputs.forEach(function (input) {
      input.checked = false;
      preferences[input.dataset.cookieCategory] = false;
    });
    saveConsent(preferences);
    hideConsentNotice();
  });

  consentNotice?.querySelector('[data-cookie-consent-accept]')?.addEventListener('click', function () {
    const preferences = {};
    inputs.forEach(function (input) {
      input.checked = true;
      preferences[input.dataset.cookieCategory] = true;
    });
    saveConsent(preferences);
    hideConsentNotice();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  window.addEventListener('focus', function () {
    const latestConsent = readConsent();
    if (!latestConsent || latestConsent.updatedAt === (activeConsent && activeConsent.updatedAt)) return;
    activeConsent = latestConsent;
    applyConsent(activeConsent);
    syncPreferences();
  });

  window.CMPLConsent = {
    version: CONSENT_VERSION,
    getConsent: function () {
      return readConsent();
    },
    openPreferences: openModal,
    closePreferences: closeModal,
    save: saveConsent,
    saveConsent: saveConsent,
    clearConsent: clearConsent,
    applyConsent: applyConsent
  };
}());
