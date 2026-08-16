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


(function setupPrinciplesMotion() {
  const section = document.querySelector(
    '[data-principles-motion]'
  );

  const steps = Array.from(
    document.querySelectorAll(
      '[data-principle-step]'
    )
  );

  if (!section || !steps.length) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (reducedMotion) return;

  let frame = null;

  function clamp(value, min, max) {
    return Math.min(
      Math.max(value, min),
      max
    );
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function update() {
    frame = null;

    const rect = section.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const start = viewportHeight * 0.9;
    const finish = Math.max(
      viewportHeight - section.offsetHeight,
      viewportHeight * 0.08
    );

    const progress = clamp(
      (start - rect.top) / Math.max(1, start - finish),
      0,
      1
    );

    const compact = window.innerWidth <= 900;
    const distance = Math.round(
      clamp(
        window.innerWidth * 0.095,
        compact ? 48 : 72,
        compact ? 88 : 164
      )
    );

    section.style.setProperty(
      '--principles-progress',
      progress.toFixed(3)
    );

    steps.forEach(function (step) {
      const direction =
        step.getAttribute(
          'data-principle-direction'
        ) === 'right'
          ? 1
          : -1;

      const delay = direction === 1 ? 0.055 : 0;
      const localProgress = clamp(
        (progress - delay) / (1 - delay),
        0,
        1
      );
      const easedProgress = easeOutCubic(
        localProgress
      );
      const remaining = 1 - easedProgress;

      step.style.opacity = String(
        0.04 + (easedProgress * 0.96)
      );
      step.style.transform =
        'translate3d(' +
        (remaining * distance * direction).toFixed(2) +
        'px, 0, 0)';
    });
  }

  function scheduleUpdate() {
    if (frame !== null) return;

    frame = window.requestAnimationFrame(update);
  }

  section.classList.add('is-motion-ready');

  window.addEventListener(
    'scroll',
    scheduleUpdate,
    { passive: true }
  );

  window.addEventListener(
    'resize',
    scheduleUpdate
  );

  scheduleUpdate();
}());


(function setupExternalProjectClick() {
  const projectMedia = document.querySelector('.project-media');

  if (!projectMedia) return;

  projectMedia.addEventListener(
    'pointermove',
    function (event) {
      if (
        !window.matchMedia('(hover: hover)').matches
      ) {
        return;
      }

      const rect =
        projectMedia.getBoundingClientRect();

      const x =
        (event.clientX - rect.left) / rect.width;

      const y =
        (event.clientY - rect.top) / rect.height;

      projectMedia.style.setProperty(
        '--pointer-x',
        (x * 100).toFixed(2) + '%'
      );

      projectMedia.style.setProperty(
        '--pointer-y',
        (y * 100).toFixed(2) + '%'
      );
    }
  );
}());


(function setupProjectFilter() {
  const filter =
    document.querySelector(
      '[data-project-filter]'
    );


  const buttons =
    Array.from(
      document.querySelectorAll(
        '[data-project-filter-button]'
      )
    );


  const cards =
    Array.from(
      document.querySelectorAll(
        '[data-project-card]'
      )
    );


  const count =
    document.querySelector(
      '[data-project-count]'
    );


  const countStatus =
    document.querySelector(
      '[data-project-count-status]'
    );


  if (
    !filter ||
    !buttons.length ||
    !cards.length
  ) {
    return;
  }


  const reducedMotion =
    window.matchMedia &&
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  let displayedCount =
    Number(
      count && count.textContent
    ) || 0;


  let countTimer = null;


  function formatCount(value) {
    return String(value).padStart(2, '0');
  }


  function updateCountStatus(value) {
    if (!countStatus) return;

    countStatus.textContent =
      value +
      (value === 1 ? ' project shown' : ' projects shown');
  }


  function renderCount(value, direction, shouldAnimate) {
    if (!count) return;

    count.textContent =
      formatCount(value);

    count.dataset.countDirection =
      direction || '';

    count.classList.remove('is-count-ticking');

    if (!shouldAnimate) return;

    void count.offsetWidth;

    count.classList.add('is-count-ticking');
  }


  function updateProjectCount(nextCount) {
    if (!count) {
      updateCountStatus(nextCount);
      return;
    }

    if (countTimer !== null) {
      window.clearTimeout(countTimer);
      countTimer = null;
    }

    updateCountStatus(nextCount);

    if (
      reducedMotion ||
      nextCount === displayedCount
    ) {
      displayedCount = nextCount;
      renderCount(nextCount, '', false);
      return;
    }

    const direction =
      nextCount > displayedCount
        ? 'up'
        : 'down';


    function step() {
      displayedCount +=
        direction === 'up' ? 1 : -1;

      renderCount(
        displayedCount,
        direction,
        true
      );

      if (displayedCount === nextCount) {
        countTimer = null;
        return;
      }

      countTimer =
        window.setTimeout(
          step,
          155
        );
    }


    step();
  }




  /* =================================================
     APPLY PROJECT FILTER


     ALL:
     Software + Websites only.


     LOGO DESIGN:
     Logo design cards only.


     Logo design NEVER appears inside All.
  ================================================= */


  function applyFilter(type) {
    let visibleIndex = 0;


    cards.forEach(
      function (card) {
        const cardType =
          card.getAttribute(
            'data-project-type'
          );


        let shouldShow = false;




        /* -------------------------------------------
           ALL
           Show normal portfolio projects only.
           Logo design is deliberately excluded.
        ------------------------------------------- */


        if (type === 'all') {
          shouldShow =
            cardType === 'software' ||
            cardType === 'website';
        }




        /* -------------------------------------------
           SPECIFIC FILTER
        ------------------------------------------- */


        else {
          shouldShow =
            cardType === type;
        }




        /* -------------------------------------------
           SHOW / HIDE
        ------------------------------------------- */


        card.hidden =
          !shouldShow;




        /* -------------------------------------------
           REBUILD STICKY STACK ORDER


           Only visible cards participate in the
           stacking sequence.


           This also means the Logo design cards
           receive 1 through the visible total when that filter is
           selected instead of depending on their
           original HTML position.
        ------------------------------------------- */


        if (shouldShow) {
          visibleIndex += 1;


          card.style.zIndex =
            String(
              visibleIndex
            );
        } else {
          card.style.zIndex = '';
        }
      }
    );


    updateProjectCount(
      visibleIndex
    );




    /* =================================================
       ACTIVE FILTER BUTTON
    ================================================= */


    buttons.forEach(
      function (button) {
        const buttonType =
          button.getAttribute(
            'data-project-filter-button'
          );


        const isActive =
          buttonType === type;


        button.classList.toggle(
          'is-active',
          isActive
        );


        button.setAttribute(
          'aria-pressed',
          String(isActive)
        );
      }
    );
  }




  /* =================================================
     FILTER BUTTON EVENTS
  ================================================= */


  buttons.forEach(
    function (button) {
      button.addEventListener(
        'click',
        function () {
          const type =
            button.getAttribute(
              'data-project-filter-button'
            );


          if (!type) {
            return;
          }


          applyFilter(
            type
          );
        }
      );
    }
  );




  /* =================================================
     DEFAULT VIEW


     Software + Websites.
     Logo design stays completely hidden until
     Logo design is selected.
  ================================================= */


  applyFilter(
    'all'
  );
}());



(function setupCredentialProgress() {
  const section =
    document.querySelector(
      '.credentials-section'
    );

  const rings = Array.from(
    document.querySelectorAll('[data-progress]')
  );

  if (!section || !rings.length) return;

  const reducedMotion =
    window.matchMedia &&
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  let animationFrame = null;

  function setRingValue(ring, value) {
    const safeValue =
      Math.max(0, Math.min(100, value));

    const text =
      ring.querySelector(
        '.credential-progress__text'
      );

    ring.style.setProperty(
      '--progress',
      safeValue.toFixed(2)
    );

    if (text) {
      text.textContent =
        Math.round(safeValue) + '%';
    }
  }

  function resetRings() {
    if (animationFrame) {
      window.cancelAnimationFrame(
        animationFrame
      );

      animationFrame = null;
    }

    rings.forEach(function (ring) {
      setRingValue(ring, 0);
    });
  }

  function animateRings() {
    if (reducedMotion) {
      rings.forEach(function (ring) {
        setRingValue(
          ring,
          Number(ring.dataset.progress) || 0
        );
      });

      return;
    }

    const duration = 1100;
    const startTime = performance.now();

    function frame(now) {
      const elapsed =
        now - startTime;

      const rawProgress =
        Math.min(
          1,
          elapsed / duration
        );

      const easedProgress =
        1 -
        Math.pow(
          1 - rawProgress,
          3
        );

      rings.forEach(function (ring) {
        const target =
          Number(
            ring.dataset.progress
          ) || 0;

        setRingValue(
          ring,
          target * easedProgress
        );
      });

      if (rawProgress < 1) {
        animationFrame =
          window.requestAnimationFrame(
            frame
          );
      } else {
        animationFrame = null;
      }
    }

    animationFrame =
      window.requestAnimationFrame(
        frame
      );
  }

  resetRings();

  if (
    !('IntersectionObserver' in window)
  ) {
    animateRings();
    return;
  }

  const observer =
    new IntersectionObserver(
      function (entries) {
        entries.forEach(
          function (entry) {
            if (entry.isIntersecting) {
              resetRings();
              animateRings();
            } else {
              resetRings();
            }
          }
        );
      },
      {
        threshold: 0.28
      }
    );

  observer.observe(section);
}());
