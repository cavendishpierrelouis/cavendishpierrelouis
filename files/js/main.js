// main.js — clock, nav, hero-mode, scroll reveals
'use strict';

/* ============================
1) DATE + TIME (Los Angeles)
============================ */
(function setupClock() {
  const dateEl  = document.getElementById('date');
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
6) DIGITAL CONTRIBUTION COUNTER + PROGRESS BAR
============================ */
(function setupContributionCounter() {
  const section     = document.getElementById('portfolio');
  const numberEl    = document.querySelector('.projects-count-number');
  const barEl       = document.querySelector('.project-progress-bar');
  const barValueEl  = document.querySelector('.project-progress-value');

  if (!section || !numberEl || !('IntersectionObserver' in window)) return;

  let hasRun = false;

  function animate() {
    if (hasRun) return;
    hasRun = true;

    const target    = parseInt(numberEl.dataset.target || '1', 10);
    const duration  = 1100;
    const startTime = performance.now();

    // start slightly above for the “drop in” effect
    numberEl.style.opacity   = '0';
    numberEl.style.transform = 'translateY(-18px)';

    function frame(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      // ---- Counter (0 → target) with soft drop / settle
      const value = Math.round(eased * target);
      numberEl.textContent   = value.toString();
      numberEl.style.opacity = '1';

      // drop in, then settle
      const drop = (1 - Math.pow(1 - progress, 2)) * 18; // 0 → 18px
      numberEl.style.transform = `translateY(${drop - 18}px)`; // -18 → 0

      // ---- Progress bar (0% → 100%)
      if (barEl) {
        const width = eased * 100;
        barEl.style.width = width + '%';

        if (barValueEl) {
          const pct = Math.round(width);
          barValueEl.textContent = pct + '%';
        }
      }

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        // ensure final state is clean
        numberEl.style.transform = 'translateY(0)';
        if (barEl) barEl.style.width = '100%';
        if (barValueEl) barValueEl.textContent = '100%';
      }
    }

    requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) animate();
      });
    },
    { threshold: 0.12 }
  );

  observer.observe(section);
})();


/* ============================
5) SCROLL REVEAL ANIMATIONS
  (.section + .js-type-on-scroll + turtle)
============================ */
(function setupScrollAnimations() {
  const animatedEls = document.querySelectorAll('.section, .js-type-on-scroll');
  if (!animatedEls.length) return;

  // Respect reduced motion: just show everything
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    animatedEls.forEach((el) => el.classList.add('is-in'));
    return;
  }

  // No IO support: lightweight scroll fallback (still loops)
  if (!('IntersectionObserver' in window)) {
    function update() {
      const vh = window.innerHeight || 0;

      animatedEls.forEach((el) => {
        const rect = el.getBoundingClientRect();

        // Consider "in view" when part of element is within viewport
        const inView = rect.top < vh * 0.88 && rect.bottom > vh * 0.12;

        el.classList.toggle('is-in', inView);
      });
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return;
  }

  // LOOPING REVEAL:
  // Add .is-in when intersecting, remove when not.
  // This creates: scroll down = fade in; scroll up = fade out.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-in', entry.isIntersecting);
      });
    },
    {
      // triggers a little before center so it feels smooth
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.12
    }
  );

  animatedEls.forEach((el) => observer.observe(el));
})();


/* ============================
4) HERO MODE
  (logo center at top, about hidden)
============================ */
(function setupHeroHeader() {
  const body = document.body;

  // Only run this on the home page
  if (!body.classList.contains('home-page')) return;

  const THRESHOLD = 160; // px before we collapse the hero

  function updateHeroMode() {
    if (window.scrollY > THRESHOLD) {
      body.classList.remove('hero-mode');
    } else {
      body.classList.add('hero-mode');
    }
  }

  // Initial state + listener
  updateHeroMode();
  window.addEventListener('scroll', updateHeroMode, { passive: true });
})();


/* ==========================================
HERO NAME — FALLING LETTERS + COLOR WAVE
+ HERO SCROLL ARROW (guide only, NOT a link)
(arrow appears ONLY after name finishes)
========================================== */
(function setupHeroNameAnimation() {
  const body = document.body;
  if (!body.classList.contains('home-page')) return;

  const header  = document.querySelector('header.pagehead');
  const nameEl  = document.querySelector('.hero-name');
  const arrowEl = document.querySelector('.hero-scroll-arrow');
  if (!header || !nameEl) return;

  // Make arrow a pure guide (no navigation)
  if (arrowEl) {
    // If it’s an <a>, remove link behavior entirely
    if (arrowEl.tagName === 'A') {
      arrowEl.removeAttribute('href');
    }
    // Prevent any default action if clicked/tapped
    arrowEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // avoid “focus scroll” quirks on iOS
      if (typeof arrowEl.blur === 'function') arrowEl.blur();
      return false;
    });
  }

  const rawName = (nameEl.dataset.name || nameEl.textContent || '').trim();
  if (!rawName) return;

  // Build letter spans once
  if (!nameEl.dataset.built) {
    const chars = Array.from(rawName);
    nameEl.textContent = ''; // clear fallback text

    const LETTER_DELAY  = 100; // ms between letters
    const BASE_DURATION = 900; // ms drop duration per letter
    const totalDuration =
      BASE_DURATION + LETTER_DELAY * Math.max(chars.length - 1, 0);

    // Store timing on element so we can reuse on replays
    nameEl.dataset.totalDuration = String(totalDuration);

    chars.forEach((ch, index) => {
      const span = document.createElement('span');
      span.className = 'hero-name-char';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      // keep your original timing behavior
      span.style.animationDelay = (LETTER_DELAY * index) / 800 + 's';
      nameEl.appendChild(span);
    });

    nameEl.dataset.built = '1';
  }

  const totalDuration = parseInt(nameEl.dataset.totalDuration || '900', 10);

  // Color-wave phases and timing
  const phases = [
    'hero-name--accent-blue',
    'hero-name--accent-orange',
    'hero-name--accent-lime',
    'hero-name--accent-orange',
    'hero-name--accent-lime',
    'hero-name--accent-blue',
  ];
  const PHASE_TIME = 480;

  let waveTimeouts = [];

  function clearWaveTimeouts() {
    waveTimeouts.forEach((id) => clearTimeout(id));
    waveTimeouts = [];
  }

  function showArrow() {
    if (!arrowEl) return;
    arrowEl.classList.remove('is-visible');
    void arrowEl.offsetWidth; // restart float-in
    arrowEl.classList.add('is-visible');
  }

  function hideArrow() {
    if (!arrowEl) return;
    arrowEl.classList.remove('is-visible');
  }

  function heroIsInView() {
    const rect = header.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  function runColorSequence() {
    let idx = 0;

    function nextPhase() {
      const cls = phases[idx];
      nameEl.classList.add(cls);

      const timeoutId = window.setTimeout(() => {
        nameEl.classList.remove(cls);
        idx += 1;

        if (idx < phases.length) {
          nextPhase();
        } else {
          // Calm final state
          nameEl.classList.add('hero-name--final');

          // Let the arrow know it can appear now
          body.classList.add('hero-arrow-ready');

          // ONLY show if hero is currently in view
          if (heroIsInView()) showArrow();
        }
      }, PHASE_TIME);

      waveTimeouts.push(timeoutId);
    }

    nextPhase();
  }

  function playHeroName() {
    // Reset any previous wave + final state
    clearWaveTimeouts();

    // Reset arrow gating for this replay
    body.classList.remove('hero-arrow-ready');
    hideArrow();

    nameEl.classList.remove(
      'hero-name--animate',
      'hero-name--final',
      'hero-name--accent-blue',
      'hero-name--accent-orange',
      'hero-name--accent-lime'
    );

    // Force reflow so CSS animations can restart cleanly
    void nameEl.offsetWidth;

    // Trigger the letter-drop animation
    nameEl.classList.add('hero-name--animate');

    // Start the color wave after all letters have dropped
    const delayId = window.setTimeout(runColorSequence, totalDuration + 350);
    waveTimeouts.push(delayId);
  }

  function onHeroEnter() {
    // Re-trigger name glow every time hero re-enters
    playHeroName();
    // Arrow is NOT shown here anymore (it will show only after name finishes)
  }

  function onHeroLeave() {
    hideArrow();
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target !== header) return;
          if (entry.isIntersecting) onHeroEnter();
          else onHeroLeave();
        });
      },
      { threshold: 0.6 }
    );
    observer.observe(header);
  } else {
    // Fallback: run once on load and show arrow after name finishes (if still in view)
    onHeroEnter();
  }
})();


/* ==========================================
SCROLL-SCALE TYPOGRAPHY
========================================== */
(function setupScrollScale() {
  const items = document.querySelectorAll('.scale-item');
  if (!items.length) return;

  // Add a tiny hysteresis so it doesn’t “flicker” near the boundary
  const ENTER_DIST_RATIO = 0.28;
  const EXIT_DIST_RATIO  = 0.32;

  function update() {
    const viewportCenter = window.innerHeight * 0.5;

    items.forEach((item) => {
      const rect        = item.getBoundingClientRect();
      const itemCenter  = rect.top + rect.height / 2;

      const dist = Math.abs(itemCenter - viewportCenter);

      const enterDistance = window.innerHeight * ENTER_DIST_RATIO;
      const exitDistance  = window.innerHeight * EXIT_DIST_RATIO;

      const isActive = item.classList.contains('is-active');

      if (!isActive && dist < enterDistance) {
        item.classList.add('is-active');
      } else if (isActive && dist > exitDistance) {
        item.classList.remove('is-active', 'is-overshoot');
      }

      // gentle overshoot when perfectly centered
      if (item.classList.contains('is-active')) {
        if (dist < 40) item.classList.add('is-overshoot');
        else item.classList.remove('is-overshoot');
      }
    });
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
})();


/* ==========================================
TURTLE TYPEWRITER — MINI HTML SNIPPET
========================================== */
(function setupTurtleTypewriter() {
  const codeEl = document.getElementById('turtleTypeTarget');
  if (!codeEl) return;

  // This is what will be typed out, exactly as devs read it
  const source = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Slowly but Surely</title>
</head>
<body>

<p>New cases are coming,<br>little by little.</p>

</body>
</html>`;

  // IMPORTANT FIX:
  // Reserve final height so typing doesn’t push the page and feel like “auto scroll”.
  (function reserveFinalHeight() {
    const prev = codeEl.textContent;
    codeEl.textContent = source;
    const h = codeEl.offsetHeight;
    codeEl.style.minHeight = h + 'px';
    codeEl.textContent = prev;
  })();

  let index  = 0;
  let hasRun = false;

  function typeNextChar() {
    if (index > source.length) return;
    codeEl.textContent = source.slice(0, index);

    index++;

    // Smooth, not too fast — feel like careful coding
    const baseSpeed = 32; // ms per char
    const variance  = 26; // random wobble so it's not robotic
    const delay     = baseSpeed + Math.random() * variance;

    if (index <= source.length) {
      setTimeout(typeNextChar, delay);
    }
  }

  function startTyping() {
    if (hasRun) return;
    hasRun = true;
    codeEl.textContent = '';
    typeNextChar();
  }

  // Start when the code block scrolls into view
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) startTyping();
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(codeEl);
  } else {
    // Fallback: just run on load
    startTyping();
  }
})();




/* ==========================================
CERTIFICATION PROGRESS BARS
========================================== */
(function setupCertProgress() {
  const section = document.getElementById('certs');
  if (!section) return;

  const rows = section.querySelectorAll('.cert-row');
  if (!rows.length || !('IntersectionObserver' in window)) return;

  function animateRow(row) {
    const bar = row.querySelector('.cert-progress-bar');
    const num = row.querySelector('.cert-percent-number');
    if (!bar || !num) return;

    const target = parseInt(row.getAttribute('data-percent') || '100', 10);
    let start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      const elapsed  = timestamp - start;
      const progress = Math.min(elapsed / 900, 1); // ~0.9s
      const eased    = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      const value = Math.round(target * eased);
      bar.style.width = value + '%';
      num.textContent = value + '%';

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateRow(entry.target);
          obs.unobserve(entry.target); // run once per row
        }
      });
    },
    { threshold: 0.4 }
  );

  rows.forEach((row) => observer.observe(row));
})();


/* ==========================================
ARTICLE FILTER CHIPS
========================================== */
(function setupArticleFilter() {
  const chips = document.querySelectorAll('.article-chip');
  const items = document.querySelectorAll('.article-item');

  if (!chips.length || !items.length) return;

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter || 'all';

      // active state on chips
      chips.forEach((c) =>
        c.classList.toggle('is-active', c === chip)
      );

      // show / hide items
      items.forEach((item) => {
        const topics = (item.dataset.topics || '').split(' ');
        const show   = filter === 'all' || topics.includes(filter);
        item.style.display = show ? '' : 'none';
      });
    });
  });
})();


/* ==========================================
BLOG TITLE — STRUCTURE / RHYTHM / COLOR
(scroll-reactive color cycling)
========================================== */
(function setupBlogTitleObserver() {
  const title = document.querySelector('.blog-title');
  if (!title) return;

  const words = title.querySelectorAll('.word');
  if (!words.length) return;

  // Brand colours already used in your CSS
  const BLUE   = '#006ee6'; // section-blue / primary accents
  const ORANGE = '#e49b34'; // credentials band
  const LIME   = '#b5d331'; // contact band

  // Subtle permutations – feels alive, not chaotic
  const palettes = [
    [BLUE,   ORANGE, LIME],
    [ORANGE, LIME,   BLUE],
    [LIME,   BLUE,   ORANGE],
    [BLUE,   LIME,   ORANGE],
    [ORANGE, BLUE,   LIME],
    [LIME,   ORANGE, BLUE]
  ];

  let cycleIndex  = 0;
  let lastScrollY = window.scrollY;
  let isActive    = false; // "in view and listening" state

  function applyPalette() {
    const palette = palettes[cycleIndex % palettes.length];

    words.forEach((word, idx) => {
      word.style.color = palette[idx % palette.length];
    });

    title.classList.add('is-active');
    cycleIndex += 1;
  }

  function handleScroll() {
    if (!isActive) return;

    const currentY = window.scrollY;
    const delta    = Math.abs(currentY - lastScrollY);

    const THRESHOLD = 68; // px
    if (delta < THRESHOLD) return;

    lastScrollY = currentY;
    applyPalette();
  }

  const hasIO = 'IntersectionObserver' in window;

  // Fallback: no IntersectionObserver, just bind scroll once
  if (!hasIO) {
    isActive = true;
    lastScrollY = window.scrollY;
    applyPalette();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== title) return;

        if (entry.isIntersecting && !isActive) {
          isActive = true;
          lastScrollY = window.scrollY;
          applyPalette();
          window.addEventListener('scroll', handleScroll, { passive: true });
        } else if (!entry.isIntersecting && isActive) {
          isActive = false;
          title.classList.remove('is-active');
          window.removeEventListener('scroll', handleScroll);
        }
      });
    },
    { threshold: 0.4 }
  );

  observer.observe(title);
})();


/* ==========================================
PROJECTS — FULL MODERN SCROLLER
- no inner scrollbar fighting
- reveals each slide (via js-type-on-scroll on slides)
- lights up the most-visible slide (is-active)
========================================== */
(function setupProjectsCarouselVertical() {
  const section = document.getElementById('portfolio');
  if (!section) return;

  const slides = Array.from(section.querySelectorAll('.project-slide'));
  if (!slides.length) return;

  // Always set an initial active slide (for first paint)
  let currentActive = slides[0];
  currentActive.classList.add('is-active');

  // If IO isn't supported, just keep the first active and exit
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    let best = null;
    let bestRatio = 0;

    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
        bestRatio = entry.intersectionRatio;
        best = entry.target;
      }
    }

    if (best && best !== currentActive) {
      slides.forEach((s) => s.classList.toggle('is-active', s === best));
      currentActive = best;
    }
  }, {
    root: null,
    rootMargin: '-22% 0px -22% 0px',
    threshold: [0.25, 0.35, 0.5, 0.65]
  });

  slides.forEach((s) => observer.observe(s));
})();

/* End of main.js */