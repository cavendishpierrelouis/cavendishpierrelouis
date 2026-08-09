'use strict';

(function setupReveal() {
  const items = Array.from(
    document.querySelectorAll('[data-reveal]')
  );

  if (!items.length) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (
    reducedMotion ||
    !('IntersectionObserver' in window)
  ) {
    items.forEach(function (item) {
      item.classList.add('is-visible');
    });

    return;
  }

  const observer = new IntersectionObserver(
    function (entries, currentObserver) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12
    }
  );

  items.forEach(function (item, index) {
    item.style.transitionDelay =
      Math.min(index % 4, 3) * 55 + 'ms';

    observer.observe(item);
  });
}());

(function setupArticleImages() {
  const images = Array.from(
    document.querySelectorAll('[data-card-image]')
  );

  if (!images.length) return;

  images.forEach(function (image) {
    function markImageMissing() {
      const media = image.closest('.blog-card__media');

      if (media) {
        media.classList.add('is-missing');
      }

      image.hidden = true;
    }

    image.addEventListener('error', markImageMissing);

    if (image.complete && image.naturalWidth === 0) {
      markImageMissing();
    }
  });
}());

(function setupAuthorAvatars() {
  const avatars = Array.from(
    document.querySelectorAll('.blog-card__author-avatar')
  );

  if (!avatars.length) return;

  avatars.forEach(function (avatar) {
    avatar.addEventListener('error', function () {
      avatar.hidden = true;

      const credit = avatar.closest('.blog-card__credit');

      if (credit) {
        credit.classList.add('has-missing-avatar');
      }
    });

    if (avatar.complete && avatar.naturalWidth === 0) {
      avatar.hidden = true;

      const credit = avatar.closest('.blog-card__credit');

      if (credit) {
        credit.classList.add('has-missing-avatar');
      }
    }
  });
}());

(function setupBlogFilters() {
  const filterGroup = document.querySelector(
    '[data-blog-filters]'
  );

  const grid = document.querySelector('[data-blog-grid]');

  if (!filterGroup || !grid) return;

  const buttons = Array.from(
    filterGroup.querySelectorAll('[data-blog-filter]')
  );

  const cards = Array.from(
    grid.querySelectorAll('[data-blog-card]')
  );

  if (!buttons.length || !cards.length) return;

  function applyFilter(selectedCategory) {
    buttons.forEach(function (button) {
      const isSelected =
        button.dataset.blogFilter === selectedCategory;

      button.classList.toggle('is-active', isSelected);

      button.setAttribute(
        'aria-pressed',
        isSelected ? 'true' : 'false'
      );
    });

    cards.forEach(function (card) {
      const matches =
        selectedCategory === 'all' ||
        card.dataset.category === selectedCategory;

      card.hidden = !matches;
    });

    window.dispatchEvent(new Event('blogfilterchange'));
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      applyFilter(button.dataset.blogFilter || 'all');
    });
  });
}());

(function setupArticleScale() {
  const cards = Array.from(
    document.querySelectorAll('[data-blog-card]')
  );

  if (!cards.length) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (reducedMotion) {
    cards.forEach(function (card) {
      card.style.setProperty('--article-scale', '1');
      card.style.setProperty('--article-opacity', '1');
    });

    return;
  }

  let ticking = false;

  function clamp(value, minimum, maximum) {
    return Math.min(
      Math.max(value, minimum),
      maximum
    );
  }

  function updateCards() {
    const viewportHeight =
      window.innerHeight ||
      document.documentElement.clientHeight;

    cards.forEach(function (card) {
      if (card.hidden) return;

      const rect = card.getBoundingClientRect();
      const startPoint = viewportHeight * 0.98;
      const endPoint = viewportHeight * 0.38;

      const progress = clamp(
        (startPoint - rect.top) /
        (startPoint - endPoint),
        0,
        1
      );

      const scale = 0.84 + progress * 0.16;
      const opacity = 0.58 + progress * 0.42;

      card.style.setProperty(
        '--article-scale',
        scale.toFixed(4)
      );

      card.style.setProperty(
        '--article-opacity',
        opacity.toFixed(4)
      );
    });

    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;

    ticking = true;
    window.requestAnimationFrame(updateCards);
  }

  updateCards();

  window.addEventListener(
    'scroll',
    requestUpdate,
    { passive: true }
  );

  window.addEventListener('resize', requestUpdate);

  window.addEventListener(
    'blogfilterchange',
    requestUpdate
  );
}());

(function setupVeryGoodColorCycle() {
  const word = document.querySelector('[data-color-cycle]');
  const section = document.querySelector('#blog-intro');

  if (!word || !section) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (reducedMotion) {
    word.style.color = 'var(--orange)';
    return;
  }

  let ticking = false;
  let colors = null;

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function readColor(value) {
    const probe = document.createElement('span');

    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    probe.style.color = value;
    document.body.appendChild(probe);

    const computed = window.getComputedStyle(probe).color;
    probe.remove();

    const values = computed.match(/[\d.]+/g);

    if (!values || values.length < 3) {
      return [255, 255, 255];
    }

    return values.slice(0, 3).map(Number);
  }

  function refreshColors() {
    const rootStyles = window.getComputedStyle(
      document.documentElement
    );

    colors = {
      orange: readColor(
        rootStyles.getPropertyValue('--orange').trim()
      ),
      white: readColor('#ffffff'),
      muted: readColor(
        rootStyles.getPropertyValue('--muted').trim()
      )
    };
  }

  function mix(from, to, amount) {
    return from.map(function (value, index) {
      return Math.round(
        value + (to[index] - value) * amount
      );
    });
  }

  function paintColor(rgb) {
    word.style.color =
      'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')';
  }

  function updateColor() {
    if (!colors) refreshColors();

    const viewportHeight =
      window.innerHeight ||
      document.documentElement.clientHeight;

    const rect = section.getBoundingClientRect();
    const start = viewportHeight * 0.9;
    const finish = -rect.height * 0.22;

    const progress = clamp(
      (start - rect.top) / (start - finish),
      0,
      1
    );

    if (progress <= 0.5) {
      paintColor(
        mix(colors.orange, colors.white, progress / 0.5)
      );
    } else {
      paintColor(
        mix(
          colors.white,
          colors.muted,
          (progress - 0.5) / 0.5
        )
      );
    }

    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;

    ticking = true;
    window.requestAnimationFrame(updateColor);
  }

  refreshColors();
  updateColor();

  window.addEventListener(
    'scroll',
    requestUpdate,
    { passive: true }
  );

  window.addEventListener('resize', requestUpdate);

  const themeObserver = new MutationObserver(function () {
    refreshColors();
    requestUpdate();
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
}());

(function setupBlogTypewriter() {
  const section = document.querySelector(
    '[data-typewriter-section]'
  );

  const toggle = document.querySelector(
    '[data-typewriter-toggle]'
  );

  const greeting = document.querySelector(
    '[data-typewriter="greeting"]'
  );

  const signoff = document.querySelector(
    '[data-typewriter="signoff"]'
  );

  if (!section || !toggle || !greeting || !signoff) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const targets = [greeting, signoff];
  const states = new Map();

  let isPaused = false;
  let currentStage = -1;
  let ticking = false;

  function fullText(target) {
    return target.dataset.typewriterText || '';
  }

  function createState(target) {
    const text = fullText(target);

    states.set(target, {
      text: text,
      index: text.length,
      timer: 0,
      destination: text.length
    });
  }

  function clearTargetTimer(target) {
    const state = states.get(target);

    if (!state || !state.timer) return;

    window.clearTimeout(state.timer);
    state.timer = 0;
  }

  function clearAllTimers() {
    targets.forEach(function (target) {
      clearTargetTimer(target);
      target.classList.remove('is-typing');
    });
  }

  function setTextImmediately(target, show) {
    const state = states.get(target);

    if (!state) return;

    clearTargetTimer(target);

    state.index = show ? state.text.length : 0;
    state.destination = state.index;

    target.textContent = state.text.slice(0, state.index);
    target.classList.remove('is-typing');
  }

  function animateText(target, show, speed) {
    const state = states.get(target);

    if (!state || isPaused) return;

    clearTargetTimer(target);

    state.destination = show ? state.text.length : 0;

    if (state.index === state.destination) {
      target.textContent = state.text.slice(0, state.index);
      target.classList.remove('is-typing');
      return;
    }

    target.classList.add('is-typing');

    function step() {
      if (isPaused) {
        target.classList.remove('is-typing');
        return;
      }

      if (state.index < state.destination) {
        state.index += 1;
      } else if (state.index > state.destination) {
        state.index -= 1;
      }

      target.textContent = state.text.slice(0, state.index);

      if (state.index === state.destination) {
        state.timer = window.setTimeout(function () {
          state.timer = 0;
          target.classList.remove('is-typing');
        }, 260);

        return;
      }

      state.timer = window.setTimeout(step, speed);
    }

    step();
  }

  function getTriggerScroll(target, viewportRatio) {
    const rect = target.getBoundingClientRect();
    const absoluteTop = window.scrollY + rect.top;

    const viewportHeight =
      window.innerHeight ||
      document.documentElement.clientHeight;

    return absoluteTop - viewportHeight * viewportRatio;
  }

  function getStage() {
    const greetingTrigger = getTriggerScroll(greeting, 0.82);
    const signoffTrigger = getTriggerScroll(signoff, 0.84);
    const scrollPosition = window.scrollY;

    if (scrollPosition < greetingTrigger) {
      return 0;
    }

    if (scrollPosition < signoffTrigger) {
      return 1;
    }

    return 2;
  }

  function applyStage(stage, force) {
    if (isPaused) return;
    if (!force && stage === currentStage) return;

    currentStage = stage;

    if (stage === 0) {
      animateText(greeting, false, 64);
      animateText(signoff, false, 60);
      return;
    }

    if (stage === 1) {
      animateText(greeting, true, 96);
      animateText(signoff, false, 60);
      return;
    }

    animateText(greeting, false, 64);
    animateText(signoff, true, 92);
  }

  function updateFromScroll() {
    applyStage(getStage(), false);
    ticking = false;
  }

  function requestUpdate() {
    if (ticking || isPaused) return;

    ticking = true;
    window.requestAnimationFrame(updateFromScroll);
  }

  function showEverything() {
    clearAllTimers();
    setTextImmediately(greeting, true);
    setTextImmediately(signoff, true);
  }

  function updateButton() {
    toggle.classList.toggle('is-paused', isPaused);

    toggle.setAttribute(
      'aria-pressed',
      isPaused ? 'true' : 'false'
    );

    toggle.setAttribute(
      'aria-label',
      isPaused
        ? 'Play text animation'
        : 'Pause text animation'
    );
  }

  targets.forEach(function (target) {
    createState(target);
  });

  if (reducedMotion) {
    showEverything();
    toggle.disabled = true;

    toggle.setAttribute(
      'aria-label',
      'Text animation disabled by reduced motion preference'
    );

    return;
  }

  setTextImmediately(greeting, false);
  setTextImmediately(signoff, false);

  currentStage = -1;
  applyStage(getStage(), true);

  window.addEventListener(
    'scroll',
    requestUpdate,
    { passive: true }
  );

  window.addEventListener('resize', function () {
    currentStage = -1;
    requestUpdate();
  });

  toggle.addEventListener('click', function () {
    isPaused = !isPaused;
    updateButton();

    if (isPaused) {
      showEverything();
      return;
    }

    currentStage = -1;
    applyStage(getStage(), true);
  });

  updateButton();
}());
