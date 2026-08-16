'use strict';

(function setupStudioClock() {
  const clock = document.querySelector('[data-studio-clock]');
  if (!clock) return;

  let timer = null;
  const newYorkFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  function getPart(parts, type) {
    return parts.find(function (part) {
      return part.type === type;
    })?.value || '';
  }

  function formatOffset(date, parts) {
    const zonedTimestamp = Date.UTC(
      Number(getPart(parts, 'year')),
      Number(getPart(parts, 'month')) - 1,
      Number(getPart(parts, 'day')),
      Number(getPart(parts, 'hour')),
      Number(getPart(parts, 'minute')),
      Number(getPart(parts, 'second'))
    );
    const totalMinutes = Math.round((zonedTimestamp - date.getTime()) / 60000);

    if (totalMinutes === 0) {
      return 'GMT';
    }

    const sign = totalMinutes >= 0 ? '+' : '-';
    const absoluteMinutes = Math.abs(totalMinutes);
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;

    return minutes === 0
      ? `GMT${sign}${hours}`
      : `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
  }

  function render() {
    const now = new Date();
    const parts = newYorkFormatter.formatToParts(now);
    const time = ['hour', 'minute', 'second']
      .map(function (part) {
        return getPart(parts, part);
      })
      .join(':');
    const zone = formatOffset(now, parts);

    clock.textContent = `${time} ${zone}`;
    clock.dateTime = now.toISOString();

    const delay = 1000 - now.getMilliseconds() + 8;
    timer = window.setTimeout(render, delay);
  }

  render();

  window.addEventListener('pagehide', function () {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }, { once: true });
}());

(function setupBinaryField() {
  const field = document.querySelector('[data-binary-field]');
  if (!field) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  let resizeTimer = null;
  let renderedCount = 0;

  function makeDigits(length) {
    let output = '';

    for (let index = 0; index < length; index += 1) {
      output += Math.random() > 0.5 ? '1' : '0';

      if (index < length - 1) {
        output += '\n';
      }
    }

    return output;
  }

  function getColumnCount() {
    const width = window.innerWidth;

    if (width <= 520) return 16;
    if (width <= 820) return 22;
    if (width <= 1180) return 30;
    return 38;
  }

  function renderColumns() {
    const count = getColumnCount();

    /* Browser chrome opening, closing, or changing height fires resize in
       Safari. Rebuilding the random streams for that harmless resize causes
       the visible jump the field was exhibiting. Only rebuild when crossing a
       layout breakpoint and the number of columns truly needs to change. */
    if (count === renderedCount && field.childElementCount === count) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (let index = 0; index < count; index += 1) {
      const column = document.createElement('span');
      const left = count === 1
        ? 50
        : (index / (count - 1)) * 100;

      const jitter = (Math.random() * 1.7) - 0.85;
      const duration = 22 + Math.random() * 18;
      const delay = -Math.random() * duration;
      const opacity = 0.13 + Math.random() * 0.14;
      const size = 0.64 + Math.random() * 0.23;
      const drift = (Math.random() * 16) - 8;
      const digitCount = 78 + Math.floor(Math.random() * 48);

      column.className = 'binary-column';
      column.textContent = makeDigits(digitCount);
      column.style.setProperty(
        '--column-left',
        `calc(${left.toFixed(3)}% + ${jitter.toFixed(2)}vw)`
      );
      column.style.setProperty('--column-duration', `${duration.toFixed(2)}s`);
      column.style.setProperty('--column-delay', `${delay.toFixed(2)}s`);
      column.style.setProperty('--column-opacity', opacity.toFixed(3));
      column.style.setProperty('--column-size', `${size.toFixed(2)}rem`);
      column.style.setProperty('--column-start-x', `${drift.toFixed(1)}px`);
      column.style.setProperty('--column-end-x', `${(-drift).toFixed(1)}px`);

      if (reducedMotion) {
        column.style.transform = `translateY(${Math.random() * 40 - 20}vh)`;
      }

      fragment.appendChild(column);
    }

    /* A single replacement prevents a transient empty frame during resize. */
    field.replaceChildren(fragment);
    renderedCount = count;
  }

  renderColumns();

  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);

    resizeTimer = window.setTimeout(function () {
      if (getColumnCount() !== renderedCount) {
        renderColumns();
      }
    }, 220);
  });

  window.addEventListener('pagehide', function () {
    if (resizeTimer !== null) {
      window.clearTimeout(resizeTimer);
      resizeTimer = null;
    }
  }, { once: true });
}());

(function setupBinaryToggle() {
  const field = document.querySelector('[data-binary-field]');
  const toggle = document.querySelector('[data-binary-toggle]');

  if (!field || !toggle) return;

  let isPaused = false;

  function applyState() {
    field.classList.toggle('is-paused', isPaused);
    toggle.classList.toggle('is-paused', isPaused);
    toggle.setAttribute('aria-pressed', String(isPaused));

    const label = isPaused
      ? 'Play background animation'
      : 'Pause background animation';

    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
  }

  applyState();

  toggle.addEventListener('click', function () {
    isPaused = !isPaused;
    applyState();
  });
}());

(function setupTypewriter() {
  const welcomeTarget = document.querySelector(
    '[data-typewriter-line="welcome"]'
  );
  const studioTarget = document.querySelector(
    '[data-typewriter-line="studio"]'
  );

  if (!welcomeTarget || !studioTarget) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (reducedMotion) {
    welcomeTarget.textContent = 'Welcome to';
    studioTarget.textContent = 'my studio';
    document.body.classList.add('is-type-started');
    document.body.classList.add('is-type-second');
    document.body.classList.add('is-type-complete');
    document.body.classList.add('is-ready');
    return;
  }

  function finish() {
    document.body.classList.remove('is-typewriting');
    document.body.classList.add('is-type-complete');

    window.setTimeout(function () {
      document.body.classList.add('is-ready');
    }, 320);
  }

  function typeText(target, text, onComplete) {
    let index = 0;
    target.textContent = '';

    function typeNextCharacter() {
      if (index >= text.length) {
        onComplete();
        return;
      }

      const character = text.charAt(index);
      target.textContent += character;
      index += 1;

      const delay = character === ' '
        ? 84
        : 70;

      window.setTimeout(typeNextCharacter, delay);
    }

    typeNextCharacter();
  }

  window.setTimeout(function () {
    document.body.classList.add('is-type-started');

    window.setTimeout(function () {
      document.body.classList.add('is-typewriting');
      typeText(welcomeTarget, 'Welcome to', function () {
        window.setTimeout(function () {
          document.body.classList.add('is-type-second');
          typeText(studioTarget, 'my studio', finish);
        }, 220);
      });
    }, 240);
  }, 420);
}());

(function setupEnterTransition() {
  const enter = document.querySelector('[data-enter-studio]');

  if (!enter) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  enter.addEventListener('click', function (event) {
    const destination = enter.href;

    if (reducedMotion) return;

    event.preventDefault();
    document.body.classList.add('is-entering');

    window.setTimeout(function () {
      window.location.href = destination;
    }, 280);
  });
}());
