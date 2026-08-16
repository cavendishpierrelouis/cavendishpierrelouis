'use strict';


/* ===================================================
  CAPABILITIES

  work.js continues to own the exact Studio menu.
  header-footer.js continues to own the shared theme system.

  This file controls:
  - New York footer clock
  - rotating hero word
  - stable vertical chapter loaders
  - stacked active descriptions
  - synchronized mixed-ratio visuals
  - right-to-left visual transitions
  - Documentation play / pause
  - Documentation PDF first-page reset
  - scroll reveals
  - reversible final Get in touch entrance
=================================================== */


/* ===================================================
  LIVE NEW YORK CLOCK
=================================================== */


(function setupStudioClock() {
  const clock =
    document.querySelector(
      '[data-studio-clock]'
    );


  if (!clock) {
    return;
  }


  let timer = null;


  const formatter =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      }
    );


  function getPart(parts, type) {
    const match =
      parts.find(
        function (part) {
          return part.type === type;
        }
      );


    return match
      ? match.value
      : '';
  }


  function getOffset(date, parts) {
    const zonedTimestamp =
      Date.UTC(
        Number(getPart(parts, 'year')),
        Number(getPart(parts, 'month')) - 1,
        Number(getPart(parts, 'day')),
        Number(getPart(parts, 'hour')),
        Number(getPart(parts, 'minute')),
        Number(getPart(parts, 'second'))
      );


    const totalMinutes =
      Math.round(
        (zonedTimestamp - date.getTime()) / 60000
      );


    if (totalMinutes === 0) {
      return 'GMT';
    }


    const sign =
      totalMinutes >= 0
        ? '+'
        : '-';


    const absoluteMinutes =
      Math.abs(totalMinutes);


    const hours =
      Math.floor(
        absoluteMinutes / 60
      );


    const minutes =
      absoluteMinutes % 60;


    return minutes === 0
      ? `GMT${sign}${hours}`
      : `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
  }


  function renderClock() {
    const now =
      new Date();


    const parts =
      formatter.formatToParts(
        now
      );


    const time = [
      getPart(parts, 'hour'),
      getPart(parts, 'minute'),
      getPart(parts, 'second')
    ].join(':');


    clock.textContent =
      `${time} ${getOffset(now, parts)}`;


    clock.dateTime =
      now.toISOString();


    timer =
      window.setTimeout(
        renderClock,
        1000 -
        now.getMilliseconds() +
        8
      );
  }


  renderClock();


  window.addEventListener(
    'pagehide',
    function () {
      if (timer !== null) {
        window.clearTimeout(
          timer
        );


        timer = null;
      }
    },
    {
      once: true
    }
  );
}());


/* ===================================================
  HERO WORD ROTATION
=================================================== */


(function setupHeroWordRotation() {
  const target =
    document.querySelector(
      '[data-hero-word]'
    );


  if (!target) {
    return;
  }


  const words = [
    'websites',
    'software',
    'brands'
  ];


  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  if (reducedMotion) {
    target.textContent =
      words[0];


    return;
  }


  let index = 0;
  let timer = null;
  let swapTimer = null;
  let settleTimer = null;


  function scheduleNext() {
    timer =
      window.setTimeout(
        rotateWord,
        2300
      );
  }


  function rotateWord() {
    target.classList.remove(
      'is-entering'
    );


    target.classList.add(
      'is-leaving'
    );


    swapTimer =
      window.setTimeout(
        function () {
          index =
            (index + 1) %
            words.length;


          target.textContent =
            words[index];


          target.classList.remove(
            'is-leaving'
          );


          target.classList.add(
            'is-entering'
          );


          settleTimer =
            window.setTimeout(
              function () {
                target.classList.remove(
                  'is-entering'
                );


                scheduleNext();
              },
              450
            );
        },
        320
      );
  }


  scheduleNext();


  window.addEventListener(
    'pagehide',
    function () {
      window.clearTimeout(
        timer
      );


      window.clearTimeout(
        swapTimer
      );


      window.clearTimeout(
        settleTimer
      );
    },
    {
      once: true
    }
  );
}());


/* ===================================================
  STACKED CHAPTER CYCLES
=================================================== */


(function setupChapterCycles() {
  const chapters =
    Array.from(
      document.querySelectorAll(
        '[data-chapter]'
      )
    );


  if (!chapters.length) {
    return;
  }


  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  chapters.forEach(
    function (chapter) {
      const cycle =
        chapter.querySelector(
          '[data-cycle]'
        );


      if (!cycle) {
        return;
      }


      const tabs =
        Array.from(
          cycle.querySelectorAll(
            '[data-cycle-tab]'
          )
        );


      const items =
        Array.from(
          cycle.querySelectorAll(
            '[data-cycle-item]'
          )
        );


      const details =
        Array.from(
          cycle.querySelectorAll(
            '[data-cycle-detail]'
          )
        );


      const visuals =
        Array.from(
          chapter.querySelectorAll(
            '[data-cycle-visual]'
          )
        );


      if (
        !tabs.length ||
        !items.length ||
        !visuals.length
      ) {
        return;
      }


      const duration =
        Number(
          chapter.dataset.cycleDuration
        ) || 5200;


      const visualExitLead =
        Math.min(
          380,
          Math.max(
            260,
            duration * 0.08
          )
        );


      const playbackButton =
        chapter.querySelector(
          '[data-documentation-playback]'
        );


      const documentationPdf =
        chapter.querySelector(
          '[data-documentation-pdf]'
        );


      const documentationIndex =
        items.findIndex(
          function (item) {
            return Boolean(
              item.querySelector(
                '[data-documentation-playback]'
              )
            );
          }
        );


      const documentationPdfSource =
        documentationPdf
          ? (
              documentationPdf.dataset.pdfSrc ||
              documentationPdf.getAttribute(
                'src'
              ) ||
              ''
            )
          : '';


      let activeIndex = 0;


      let nextTimer = null;
      let exitTimer = null;


      let progressFrameOne = null;
      let progressFrameTwo = null;
      let isInView = false;
      let isPaused = false;


      let cycleStartedAt = 0;
      let remainingTime = duration;


      cycle.style.setProperty(
        '--cycle-duration',
        `${duration}ms`
      );


      /* ===================================================
        TIMER CLEANUP
      =================================================== */


      function clearProgressFrames() {
        if (
          progressFrameOne !== null
        ) {
          window.cancelAnimationFrame(
            progressFrameOne
          );


          progressFrameOne = null;
        }


        if (
          progressFrameTwo !== null
        ) {
          window.cancelAnimationFrame(
            progressFrameTwo
          );


          progressFrameTwo = null;
        }
      }


      function clearTimers() {
        if (
          nextTimer !== null
        ) {
          window.clearTimeout(
            nextTimer
          );


          nextTimer = null;
        }


        if (
          exitTimer !== null
        ) {
          window.clearTimeout(
            exitTimer
          );


          exitTimer = null;
        }
      }


      function removeLeavingStates() {
        visuals.forEach(
          function (visual) {
            visual.classList.remove(
              'is-leaving'
            );
          }
        );
      }


      /* ===================================================
        DOCUMENTATION PDF
      =================================================== */


      /*
        Keep the native PDF viewer mounted once it
        has loaded. Tearing it down with about:blank
        on each cycle causes a visible blank flash.

        The initial #page=1 fragment still sets the
        deck's first page without interrupting it.
      */
      function ensureDocumentationPdf() {
        if (
          !documentationPdf ||
          !documentationPdfSource
        ) {
          return;
        }


        if (
          documentationPdf.getAttribute(
            'src'
          ) !== documentationPdfSource
        ) {
          documentationPdf.setAttribute(
            'src',
            documentationPdfSource
          );
        }
      }


      /* ===================================================
        PLAYBACK CONTROL
      =================================================== */


      function updatePlaybackButton() {
        if (!playbackButton) {
          return;
        }


        playbackButton.setAttribute(
          'aria-pressed',
          String(isPaused)
        );


        playbackButton.setAttribute(
          'aria-label',
          isPaused
            ? 'Play documentation'
            : 'Pause documentation'
        );
      }


      function pauseCycle() {
        if (
          isPaused ||
          activeIndex !== documentationIndex
        ) {
          return;
        }


        const now =
          performance.now();


        const elapsed =
          Math.max(
            0,
            now - cycleStartedAt
          );


        remainingTime =
          Math.max(
            0,
            remainingTime - elapsed
          );


        clearTimers();
        clearProgressFrames();


        removeLeavingStates();


        isPaused = true;


        cycle.classList.add(
          'is-paused'
        );


        updatePlaybackButton();
      }


      function resumeCycle() {
        if (!isPaused) {
          return;
        }


        isPaused = false;


        cycle.classList.remove(
          'is-paused'
        );


        updatePlaybackButton();


        if (!isInView) {
          return;
        }


        /*
          The CSS loader remained physically paused,
          so do NOT restart the animation.

          Only resume the JavaScript clocks using
          the remaining amount of time.
        */
        scheduleTimers(
          Math.max(
            remainingTime,
            1
          )
        );
      }


      function releaseDocumentationPause() {
        if (!isPaused) {
          return;
        }


        isPaused = false;


        cycle.classList.remove(
          'is-paused'
        );


        updatePlaybackButton();


        remainingTime =
          duration;
      }


      if (playbackButton) {
        playbackButton.addEventListener(
          'click',
          function (event) {
            event.preventDefault();
            event.stopPropagation();


            if (
              activeIndex !==
              documentationIndex
            ) {
              return;
            }


            if (isPaused) {
              resumeCycle();
            } else {
              pauseCycle();
            }
          }
        );
      }


      updatePlaybackButton();


      /* ===================================================
        IMAGE EXIT
      =================================================== */


      function beginVisualExit() {
        if (isPaused) {
          return;
        }


        const currentVisual =
          visuals[activeIndex];


        if (!currentVisual) {
          return;
        }


        currentVisual.classList.add(
          'is-leaving'
        );
      }


      /* ===================================================
        TIMERS
      =================================================== */


      function scheduleTimers(
        runDuration
      ) {
        clearTimers();


        if (
          reducedMotion ||
          !isInView ||
          isPaused
        ) {
          return;
        }


        remainingTime =
          runDuration;


        cycleStartedAt =
          performance.now();


        const exitDelay =
          Math.max(
            0,
            runDuration -
            visualExitLead
          );


        exitTimer =
          window.setTimeout(
            beginVisualExit,
            exitDelay
          );


        nextTimer =
          window.setTimeout(
            function () {
              setActive(
                (
                  activeIndex + 1
                ) %
                items.length
              );
            },
            runDuration
          );
      }


      /* ===================================================
        LOADER
      =================================================== */


      /*
        Two animation frames guarantee the browser
        has completely committed the reset before
        the animation starts again.

        This prevents the loader from:
        - disappearing
        - bouncing
        - resuming halfway
        - skipping a frame
      */
      function restartProgress() {
        clearProgressFrames();


        cycle.style.setProperty(
          '--cycle-index',
          String(activeIndex)
        );


        cycle.classList.remove(
          'is-running'
        );


        cycle.classList.remove(
          'is-paused'
        );


        if (
          reducedMotion ||
          !isInView
        ) {
          return;
        }


        remainingTime =
          duration;


        progressFrameOne =
          window.requestAnimationFrame(
            function () {
              progressFrameOne = null;


              progressFrameTwo =
                window.requestAnimationFrame(
                  function () {
                    progressFrameTwo = null;


                    if (
                      !isInView ||
                      isPaused
                    ) {
                      return;
                    }


                    cycle.classList.add(
                      'is-running'
                    );


                    scheduleTimers(
                      duration
                    );
                  }
                );
            }
          );
      }


      /* ===================================================
        ACTIVE ITEM
      =================================================== */


      function setActive(index) {
        const nextIndex =
          (
            (
              index %
              items.length
            ) +
            items.length
          ) %
          items.length;


        /*
          Documentation pause belongs only to
          Documentation.

          If the user manually selects another item,
          playback returns to the normal running state.
        */
        if (
          isPaused &&
          nextIndex !==
          documentationIndex
        ) {
          releaseDocumentationPause();
        }


        clearTimers();
        clearProgressFrames();


        activeIndex =
          nextIndex;


        remainingTime =
          duration;


        cycle.style.setProperty(
          '--cycle-index',
          String(activeIndex)
        );


        removeLeavingStates();


        items.forEach(
          function (
            item,
            itemIndex
          ) {
            const active =
              itemIndex ===
              activeIndex;


            item.classList.toggle(
              'is-active',
              active
            );
          }
        );


        tabs.forEach(
          function (
            tab,
            tabIndex
          ) {
            const active =
              tabIndex ===
              activeIndex;


            tab.setAttribute(
              'aria-expanded',
              String(active)
            );
          }
        );


        details.forEach(
          function (
            detail,
            detailIndex
          ) {
            const active =
              detailIndex ===
              activeIndex;


            detail.setAttribute(
              'aria-hidden',
              String(!active)
            );
          }
        );


        visuals.forEach(
          function (
            visual,
            visualIndex
          ) {
            const active =
              visualIndex ===
              activeIndex;


            visual.classList.toggle(
              'is-active',
              active
            );


            visual.setAttribute(
              'aria-hidden',
              String(!active)
            );
          }
        );


        /*
          Every time Documentation becomes active,
          ensure its PDF source is available.
        */
        if (
          activeIndex ===
          documentationIndex
        ) {
          ensureDocumentationPdf();
        }


        restartProgress();
      }


      /* ===================================================
        MANUAL TABS
      =================================================== */


      tabs.forEach(
        function (
          tab,
          index
        ) {
          tab.addEventListener(
            'click',
            function () {
              /*
                Clicking a different item while
                Documentation is paused releases
                the Documentation-only pause.
              */
              if (
                isPaused &&
                index !==
                documentationIndex
              ) {
                releaseDocumentationPause();
              }


              /*
                Clicking the already-active
                Documentation title while paused
                leaves it paused.

                The dedicated Play button owns
                resuming.
              */
              if (
                isPaused &&
                index ===
                activeIndex
              ) {
                return;
              }


              setActive(
                index
              );
            }
          );
        }
      );


      /* ===================================================
        VIEWPORT STATE
      =================================================== */


      const observer =
        new IntersectionObserver(
          function (entries) {
            entries.forEach(
              function (entry) {
                if (
                  entry.target !==
                  chapter
                ) {
                  return;
                }


                isInView =
                  entry.isIntersecting;


                if (isInView) {

                  /*
                    If Documentation is paused,
                    preserve that exact paused state
                    even after scrolling away and back.
                  */
                  if (isPaused) {
                    cycle.classList.add(
                      'is-running'
                    );


                    cycle.classList.add(
                      'is-paused'
                    );


                    if (
                      activeIndex ===
                      documentationIndex
                    ) {
                      ensureDocumentationPdf();
                    }


                    return;
                  }


                  restartProgress();


                  if (
                    activeIndex ===
                    documentationIndex
                  ) {
                    ensureDocumentationPdf();
                  }

                } else {

                  clearTimers();
                  clearProgressFrames();


                  removeLeavingStates();


                  /*
                    Do not destroy a Documentation
                    pause when it leaves the viewport.

                    It remains paused until Play,
                    a manual tab change, or reload.
                  */
                  if (!isPaused) {
                    cycle.classList.remove(
                      'is-running'
                    );
                  }
                }
              }
            );
          },
          {
            threshold: 0.2
          }
        );


      observer.observe(
        chapter
      );


      /* ===================================================
        INITIAL STATE
      =================================================== */


      items.forEach(
        function (
          item,
          itemIndex
        ) {
          item.classList.toggle(
            'is-active',
            itemIndex === 0
          );
        }
      );


      tabs.forEach(
        function (
          tab,
          tabIndex
        ) {
          tab.setAttribute(
            'aria-expanded',
            String(
              tabIndex === 0
            )
          );
        }
      );


      details.forEach(
        function (
          detail,
          detailIndex
        ) {
          detail.setAttribute(
            'aria-hidden',
            String(
              detailIndex !== 0
            )
          );
        }
      );


      visuals.forEach(
        function (
          visual,
          visualIndex
        ) {
          visual.classList.toggle(
            'is-active',
            visualIndex === 0
          );


          visual.classList.remove(
            'is-leaving'
          );


          visual.setAttribute(
            'aria-hidden',
            String(
              visualIndex !== 0
            )
          );
        }
      );


      cycle.style.setProperty(
        '--cycle-index',
        '0'
      );


      /* ===================================================
        CLEANUP
      =================================================== */


      window.addEventListener(
        'pagehide',
        function () {
          clearTimers();
          clearProgressFrames();


          observer.disconnect();
        },
        {
          once: true
        }
      );
    }
  );
}());


/* ===================================================
  SCROLL REVEALS
=================================================== */


(function setupScrollReveals() {
  const items =
    Array.from(
      document.querySelectorAll(
        '[data-reveal]'
      )
    );


  if (!items.length) {
    return;
  }


  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  if (reducedMotion) {
    items.forEach(
      function (item) {
        item.classList.add(
          'is-visible'
        );
      }
    );


    return;
  }


  const observer =
    new IntersectionObserver(
      function (entries) {
        entries.forEach(
          function (entry) {
            if (
              !entry.isIntersecting
            ) {
              return;
            }


            entry.target.classList.add(
              'is-visible'
            );


            observer.unobserve(
              entry.target
            );
          }
        );
      },
      {
        threshold: 0.16,


        rootMargin:
          '0px 0px -8% 0px'
      }
    );


  items.forEach(
    function (item) {
      /*
        The final Get in touch section has its own
        reversible scroll controller below.

        Do not let the normal one-time reveal system
        control it.
      */
      if (
        item.closest(
          '[data-final-cta]'
        )
      ) {
        return;
      }


      observer.observe(
        item
      );
    }
  );


  window.addEventListener(
    'pagehide',
    function () {
      observer.disconnect();
    },
    {
      once: true
    }
  );
}());


/* ===================================================
  FINAL GET IN TOUCH
  REVERSIBLE ON EVERY SCROLL PASS
=================================================== */


(function setupFinalContactReveal() {
  const section =
    document.querySelector(
      '[data-final-cta]'
    ) ||
    document.querySelector(
      '.capabilities-end'
    );


  if (!section) {
    return;
  }


  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  if (reducedMotion) {
    section.classList.add(
      'is-visible'
    );


    return;
  }


  let frame = null;


  /*
    The CTA becomes visible once it enters the lower
    portion of the viewport.

    It remains visible while the section is meaningfully
    on screen.

    When the visitor scrolls upward and the section leaves
    below the viewport, is-visible is removed, allowing the
    CTA to slide back down.

    Because this is evaluated continuously, the animation
    repeats every single time the visitor returns.
  */
  function updateFinalContact() {
    frame = null;


    const rect =
      section.getBoundingClientRect();


    const viewportHeight =
      window.innerHeight ||
      document.documentElement.clientHeight;


    const enterLine =
      viewportHeight * 0.84;


    const exitTopLine =
      viewportHeight * 0.08;


    const isInsideRevealRange =
      rect.top <= enterLine &&
      rect.bottom >= exitTopLine;


    section.classList.toggle(
      'is-visible',
      isInsideRevealRange
    );
  }


  function requestFinalContactUpdate() {
    if (
      frame !== null
    ) {
      return;
    }


    frame =
      window.requestAnimationFrame(
        updateFinalContact
      );
  }


  updateFinalContact();


  window.addEventListener(
    'scroll',
    requestFinalContactUpdate,
    {
      passive: true
    }
  );


  window.addEventListener(
    'resize',
    requestFinalContactUpdate,
    {
      passive: true
    }
  );


  window.addEventListener(
    'pageshow',
    requestFinalContactUpdate
  );


  window.addEventListener(
    'pagehide',
    function () {
      if (
        frame !== null
      ) {
        window.cancelAnimationFrame(
          frame
        );


        frame = null;
      }
    },
    {
      once: true
    }
  );
}());


/* ===================================================
  LOCK FINAL BRAND STRIP
=================================================== */


(function setupFinalBrandStrip() {
  const chapter =
    document.querySelector(
      '#brand-design'
    );


  if (!chapter) {
    return;
  }


  const bar =
    chapter.querySelector(
      '.capabilities-chapter__bar'
    );


  if (!bar) {
    return;
  }


  let frame = null;


  function measureBar() {
    const height =
      bar
        .getBoundingClientRect()
        .height;


    document.documentElement
      .style
      .setProperty(
        '--capabilities-final-bar-height',
        `${height}px`
      );
  }


  function updateBar() {
    frame = null;


    const chapterTop =
      chapter
        .getBoundingClientRect()
        .top;


    const shouldLock =
      chapterTop <= 0;


    chapter.classList.toggle(
      'is-final-bar-locked',
      shouldLock
    );


    bar.classList.toggle(
      'is-final-locked',
      shouldLock
    );
  }


  function requestUpdate() {
    if (
      frame !== null
    ) {
      return;
    }


    frame =
      window.requestAnimationFrame(
        updateBar
      );
  }


  measureBar();
  updateBar();


  window.addEventListener(
    'scroll',
    requestUpdate,
    {
      passive: true
    }
  );


  window.addEventListener(
    'resize',
    function () {
      measureBar();
      requestUpdate();
    }
  );


  window.addEventListener(
    'pageshow',
    function () {
      measureBar();
      requestUpdate();
    }
  );


  window.addEventListener(
    'pagehide',
    function () {
      if (
        frame !== null
      ) {
        window.cancelAnimationFrame(
          frame
        );


        frame = null;
      }
    },
    {
      once: true
    }
  );
}());
