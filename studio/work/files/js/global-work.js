'use strict';








/* ===================================================
GLOBAL PROJECT CASE




work.js owns:
- Studio Menu
- Menu open / close behavior




header-footer.js owns:
- Shared light / dark theme
- Shared cookie controls
- Shared portfolio systems




This file owns:
- New York footer clock
- ONE central project-video controller
- Project video play / pause
- Optional project-video dark / light switch
- Services loader cycle
- Process / Results scroll motion
- Scroll reveals




IMPORTANT:
This file is the ONLY file that owns video playback.




global-2.js may register and request video changes,
but it does not independently play / pause / reload
the visible media.
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








  let timer =
    null;








  const formatter =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'America/New_York',




        year:
          'numeric',




        month:
          '2-digit',




        day:
          '2-digit',




        hour:
          '2-digit',




        minute:
          '2-digit',




        second:
          '2-digit',




        hourCycle:
          'h23'
      }
    );








  function getPart(
    parts,
    type
  ) {








    const match =
      parts.find(
        function (part) {
          return (
            part.type ===
            type
          );
        }
      );








    return match
      ? match.value
      : '';








  }








  function getOffset(
    date,
    parts
  ) {








    const zonedTimestamp =
      Date.UTC(
        Number(
          getPart(
            parts,
            'year'
          )
        ),




        Number(
          getPart(
            parts,
            'month'
          )
        ) - 1,




        Number(
          getPart(
            parts,
            'day'
          )
        ),




        Number(
          getPart(
            parts,
            'hour'
          )
        ),




        Number(
          getPart(
            parts,
            'minute'
          )
        ),




        Number(
          getPart(
            parts,
            'second'
          )
        )
      );








    const totalMinutes =
      Math.round(
        (
          zonedTimestamp -
          date.getTime()
        ) /
        60000
      );








    if (
      totalMinutes ===
      0
    ) {
      return 'GMT';
    }








    const sign =
      totalMinutes >= 0
        ? '+'
        : '-';








    const absoluteMinutes =
      Math.abs(
        totalMinutes
      );








    const hours =
      Math.floor(
        absoluteMinutes /
        60
      );








    const minutes =
      absoluteMinutes %
      60;








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
      getPart(
        parts,
        'hour'
      ),




      getPart(
        parts,
        'minute'
      ),




      getPart(
        parts,
        'second'
      )
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








      if (
        timer !==
        null
      ) {








        window.clearTimeout(
          timer
        );








        timer =
          null;








      }








    },




    {
      once:
        true
    }
  );








}());








/* ===================================================
CENTRAL PROJECT VIDEO CONTROLLER




WHY THIS EXISTS




Previously:
- global-work.js played / paused video
- global-2.js paused video
- global-2.js changed src
- global-2.js called load()
- global-2.js tried to seek
- global-2.js called play()
- global-work.js reacted to those same events




That created competing media state.




Now:
- videos are created once
- alternate videos are preloaded
- ONE video is active
- inactive videos are paused
- source replacement is avoided during switching
- no repeated load / seek / reload cycle
- no double playback during crossfades
=================================================== */








(function setupCaseVideo() {








  const initialVideos =
    Array.from(
      document.querySelectorAll(
        '[data-case-video]'
      )
    );








  if (
    !initialVideos.length
  ) {
    return;
  }








  /*
    IMPORTANT:




    Only the REAL Play/Pause button can own playback.




    Project extension controls such as:
    - CavBot website/software
    - Daryna language
    - Lions Jungle dark/light




    can never become the Play/Pause control simply
    because they happen to contain a copied attribute.
  */
  const toggle =
    document.querySelector(
      '.case-browser__video-control[data-case-video-toggle]'
    );








  const viewport =
    initialVideos[0]
      .closest(
        '.case-browser__viewport'
      );








  const projectTitle =
    document.querySelector(
      '.case-title'
    );








  const projectName =
    projectTitle
      ? projectTitle.textContent.trim()
      : 'Project';








  const registeredVideos =
    new Set();








  let activeVideo =
    null;








  let userPaused =
    false;








  let viewportIsActive =
    true;








  let documentIsVisible =
    !document.hidden;








  let switchToken =
    0;








  let viewportObserver =
    null;








  /* ===================================================
  CONTROL
  =================================================== */








  function updateControl() {








    if (
      !toggle ||
      !activeVideo
    ) {
      return;
    }








    const isPaused =
      activeVideo.paused;








    toggle.classList.toggle(
      'is-paused',
      isPaused
    );








    toggle.setAttribute(
      'aria-pressed',
      String(
        isPaused
      )
    );








    toggle.setAttribute(
      'aria-label',
      isPaused
        ? `Play ${projectName} preview`
        : `Pause ${projectName} preview`
    );








  }








  /* ===================================================
  VIDEO REGISTRATION
  =================================================== */








  function registerVideo(
    video,
    options
  ) {








    if (
      !video ||
      registeredVideos.has(
        video
      )
    ) {
      return video;
    }








    const settings =
      options ||
      {};








    registeredVideos.add(
      video
    );








    /*
      Every project preview is intentionally silent.
    */
    video.muted =
      true;








    video.defaultMuted =
      true;








    video.playsInline =
      true;








    video.setAttribute(
      'playsinline',
      ''
    );








    video.controls =
      false;








    /*
      The actual video canvas is never clicked.




      Disabling hit testing here leaves the buttons
      above the video completely interactive while
      removing unnecessary pointer targeting across
      a large hardware-decoded media surface.




      This also helps the custom cursor remain lighter
      while moving over the preview.
    */
    video.style.pointerEvents =
      'none';








    /*
      Avoid browser-native media UI being layered over
      our custom Studio controls.
    */
    if (
      'disablePictureInPicture' in
      video
    ) {








      video.disablePictureInPicture =
        true;








    }








    if (
      'disableRemotePlayback' in
      video
    ) {








      video.disableRemotePlayback =
        true;








    }








    if (
      settings.preload
    ) {








      video.preload =
        settings.preload;








    }








    video.addEventListener(
      'play',




      function () {








        /*
          Never allow a hidden / inactive preview
          to continue decoding in the background.
        */
        if (
          video !==
          activeVideo
        ) {








          video.pause();




          return;








        }








        updateControl();








      }
    );








    video.addEventListener(
      'pause',




      function () {








        if (
          video ===
          activeVideo
        ) {








          updateControl();








        }








      }
    );








    video.addEventListener(
      'ended',




      function () {








        if (
          video ===
          activeVideo
        ) {








          updateControl();








        }








      }
    );








    return video;








  }








  initialVideos.forEach(
    function (video) {








      registerVideo(
        video
      );








    }
  );








  /* ===================================================
  INITIAL ACTIVE VIDEO
  =================================================== */








  const darkVideo =
    document.querySelector(
      '[data-case-video-dark]'
    );








  const lightVideo =
    document.querySelector(
      '[data-case-video-light]'
    );








  const videoThemeToggle =
    document.querySelector(
      '[data-case-video-theme-toggle]'
    );








  activeVideo =
    initialVideos.find(
      function (video) {








        return video.classList.contains(
          'is-active'
        );








      }
    ) ||
    darkVideo ||
    initialVideos[0];








  activeVideo.classList.add(
    'is-active'
  );








  /*
    Immediately stop every video except the
    one the visitor can actually see.




    This is important on pages containing:
    - dark + light videos
    - website + software videos
    - three language videos
  */
  registeredVideos.forEach(
    function (video) {








      if (
        video !==
        activeVideo
      ) {








        video.autoplay =
          false;








        video.removeAttribute(
          'autoplay'
        );








        video.classList.remove(
          'is-active'
        );








        if (
          !video.paused
        ) {








          video.pause();








        }








      }








    }
  );








  /* ===================================================
  SAFE PLAY
  =================================================== */








  function playVideo(
    video,
    force
  ) {








    if (
      !video ||
      video !==
      activeVideo
    ) {
      return Promise.resolve(
        false
      );
    }








    if (
      !force &&
      (
        userPaused ||
        !viewportIsActive ||
        !documentIsVisible
      )
    ) {








      return Promise.resolve(
        false
      );








    }








    if (
      !video.paused
    ) {








      updateControl();




      return Promise.resolve(
        true
      );








    }








    let playPromise;








    try {








      playPromise =
        video.play();








    } catch (error) {








      updateControl();




      return Promise.resolve(
        false
      );








    }








    if (
      playPromise &&
      typeof playPromise.then ===
      'function'
    ) {








      return playPromise
        .then(
          function () {








            updateControl();




            return true;








          }
        )
        .catch(
          function () {








            updateControl();




            return false;








          }
        );








    }








    updateControl();








    return Promise.resolve(
      !video.paused
    );








  }








  /* ===================================================
  PAUSE
  =================================================== */








  function pauseVideo(
    video
  ) {








    if (
      !video ||
      video.paused
    ) {
      return;
    }








    video.pause();








  }








  function pauseInactiveVideos() {








    registeredVideos.forEach(
      function (video) {








        if (
          video !==
          activeVideo
        ) {








          pauseVideo(
            video
          );








        }








      }
    );








  }








  /* ===================================================
  WAIT UNTIL VIDEO HAS A FRAME
  =================================================== */








  function waitUntilReady(
    video
  ) {








    return new Promise(
      function (resolve) {








        if (!video) {








          resolve(
            false
          );




          return;








        }








        /*
          HAVE_CURRENT_DATA or better means the browser
          has enough information to display a frame.
        */
        if (
          video.readyState >=
          HTMLMediaElement.HAVE_CURRENT_DATA
        ) {








          resolve(
            true
          );




          return;








        }








        let finished =
          false;








        let timeout =
          null;








        function finish(
          result
        ) {








          if (
            finished
          ) {
            return;
          }








          finished =
            true;








          video.removeEventListener(
            'loadeddata',
            onReady
          );








          video.removeEventListener(
            'canplay',
            onReady
          );








          video.removeEventListener(
            'error',
            onError
          );








          if (
            timeout !==
            null
          ) {








            window.clearTimeout(
              timeout
            );








            timeout =
              null;








          }








          resolve(
            result
          );








        }








        function onReady() {








          finish(
            true
          );








        }








        function onError() {








          finish(
            false
          );








        }








        video.addEventListener(
          'loadeddata',
          onReady,
          {
            once:
              true
          }
        );








        video.addEventListener(
          'canplay',
          onReady,
          {
            once:
              true
          }
        );








        video.addEventListener(
          'error',
          onError,
          {
            once:
              true
          }
        );








        /*
          Never leave a switch permanently waiting.




          If the browser has not produced loadeddata
          after this point, we still let the media
          element become active so its normal loading
          state can continue.
        */
        timeout =
          window.setTimeout(
            function () {








              finish(
                video.readyState >
                HTMLMediaElement.HAVE_NOTHING
              );








            },




            1800
          );








        if (
          video.networkState ===
          HTMLMediaElement.NETWORK_EMPTY
        ) {








          try {








            video.load();








          } catch (error) {








            /*
              Nothing else is required.
              The timeout / media events handle it.
            */








          }








        }








      }
    );








  }








  /* ===================================================
  SWITCH ACTIVE VIDEO




  No source destruction.
  No repeated source swapping.
  No forced seek.
  No simultaneous playback.




  The previous video's last frame remains visible
  until the incoming video has a real frame ready.
  =================================================== */








  async function switchTo(
    targetVideo,
    options
  ) {








    if (
      !targetVideo
    ) {
      return false;
    }








    registerVideo(
      targetVideo,
      {
        preload:
          'auto'
      }
    );








    if (
      targetVideo ===
      activeVideo
    ) {








      updateControl();




      return true;








    }








    const settings =
      options ||
      {};








    const previousVideo =
      activeVideo;








    const previousWasPlaying =
      previousVideo
        ? !previousVideo.paused
        : false;








    const shouldPlay =
      settings.play !==
      undefined
        ? Boolean(
            settings.play
          )
        : (
            previousWasPlaying &&
            !userPaused
          );








    const token =
      ++switchToken;








    /*
      Let the existing visible video continue until
      the alternate video can actually render a frame.




      This prevents blank / black flashes.
    */
    const ready =
      await waitUntilReady(
        targetVideo
      );








    if (
      token !==
      switchToken
    ) {
      return false;
    }








    /*
      If the browser reports an actual media error,
      never destroy the currently working preview.
    */
    if (
      !ready &&
      targetVideo.error
    ) {








      updateControl();




      return false;








    }








    /*
      Activate target FIRST.




      CSS can now reveal it while the previous frame
      still exists underneath.
    */
    targetVideo.classList.add(
      'is-active'
    );








    activeVideo =
      targetVideo;








    /*
      Immediately stop decoding the old video.




      We intentionally do NOT leave both videos
      playing during a 320ms fade anymore.
    */
    if (
      previousVideo &&
      previousVideo !==
      targetVideo
    ) {








      pauseVideo(
        previousVideo
      );








      previousVideo.classList.remove(
        'is-active'
      );








    }








    pauseInactiveVideos();








    updateControl();








    /*
      Dispatch a tiny internal event so optional
      controls can respond without taking ownership
      of playback.
    */
    document.dispatchEvent(
      new CustomEvent(
        'cmpl:case-video-change',
        {
          detail: {
            video:
              activeVideo
          }
        }
      )
    );








    if (
      shouldPlay &&
      !userPaused
    ) {








      await playVideo(
        activeVideo,
        false
      );








    } else {








      pauseVideo(
        activeVideo
      );








    }








    updateControl();








    return true;








  }








  /* ===================================================
  PUBLIC CONTROLLER




  global-2.js talks to THIS instead of directly
  fighting with the media element.
  =================================================== */








  window.CMPLCaseVideo =
    {
      registerVideo:
        registerVideo,




      switchTo:
        switchTo,




      getActiveVideo:
        function () {
          return activeVideo;
        },




      isUserPaused:
        function () {
          return userPaused;
        },




      setUserPaused:
        function (value) {








          userPaused =
            Boolean(
              value
            );








          updateControl();








        },




      playActive:
        function () {








          userPaused =
            false;








          return playVideo(
            activeVideo,
            true
          );








        },




      pauseActive:
        function () {








          userPaused =
            true;








          pauseVideo(
            activeVideo
          );








          updateControl();








        },




      refreshControl:
        updateControl
    };








  /*
    Tell optional project extensions that the one
    central controller is now ready.




    global-2.js can listen for this if deferred script
    execution order ever changes.
  */
  document.dispatchEvent(
    new CustomEvent(
      'cmpl:case-video-controller-ready',
      {
        detail: {
          controller:
            window.CMPLCaseVideo
        }
      }
    )
  );








  /* ===================================================
  PLAY / PAUSE BUTTON
  =================================================== */








  if (
    toggle
  ) {








    toggle.addEventListener(
      'click',




      function (event) {








        /*
          This click belongs ONLY to Play/Pause.




          Keep it completely isolated from optional
          project switchers.
        */
        event.preventDefault();




        event.stopPropagation();








        if (
          !activeVideo
        ) {
          return;
        }








        if (
          activeVideo.paused
        ) {








          userPaused =
            false;








          playVideo(
            activeVideo,
            true
          );








        } else {








          userPaused =
            true;








          pauseVideo(
            activeVideo
          );








          updateControl();








        }








      }
    );








  }








  /* ===================================================
  OPTIONAL DARK / LIGHT VIDEO SWITCH
  LIONS JUNGLE
  =================================================== */








  function updateThemeControl(
    lightIsActive
  ) {








    if (
      !videoThemeToggle
    ) {
      return;
    }








    videoThemeToggle.classList.toggle(
      'is-light-video',
      lightIsActive
    );








    videoThemeToggle.setAttribute(
      'aria-pressed',
      String(
        lightIsActive
      )
    );








    videoThemeToggle.setAttribute(
      'aria-label',
      lightIsActive
        ? 'Show dark version'
        : 'Show light version'
    );








  }








  if (
    videoThemeToggle &&
    darkVideo &&
    lightVideo
  ) {








    registerVideo(
      darkVideo,
      {
        preload:
          'auto'
      }
    );








    registerVideo(
      lightVideo,
      {
        preload:
          'auto'
      }
    );








    darkVideo.classList.add(
      'is-active'
    );








    lightVideo.classList.remove(
      'is-active'
    );








    activeVideo =
      darkVideo;








    pauseVideo(
      lightVideo
    );








    updateThemeControl(
      false
    );








    let requestedLight =
      false;








    videoThemeToggle.addEventListener(
      'click',




      async function (event) {








        event.preventDefault();




        event.stopPropagation();








        requestedLight =
          !requestedLight;








        const targetVideo =
          requestedLight
            ? lightVideo
            : darkVideo;








        /*
          No forced currentTime copying.




          Seeking two full videos every time the user
          switches was one of the expensive operations
          contributing to visible glitches.




          Each variant simply resumes from the point
          where it was last paused.
        */
        const switched =
          await switchTo(
            targetVideo
          );








        if (
          switched
        ) {








          updateThemeControl(
            requestedLight
          );








        } else {








          /*
            If switching failed, put the icon back in
            sync with the video that actually remained
            visible.
          */
          requestedLight =
            activeVideo ===
            lightVideo;








          updateThemeControl(
            requestedLight
          );








        }








      }
    );








  }








  /* ===================================================
  VIEWPORT PLAYBACK MANAGEMENT




  When the entire browser preview is far off-screen,
  stop decoding it.




  When it returns, resume only if the visitor did not
  manually press Pause.
  =================================================== */








  if (
    viewport &&
    'IntersectionObserver' in
    window
  ) {








    viewportObserver =
      new IntersectionObserver(
        function (entries) {








          entries.forEach(
            function (entry) {








              if (
                entry.target !==
                viewport
              ) {
                return;
              }








              viewportIsActive =
                entry.isIntersecting;








              if (
                viewportIsActive
              ) {








                if (
                  !userPaused &&
                  documentIsVisible
                ) {








                  playVideo(
                    activeVideo,
                    false
                  );








                }








              } else {








                pauseVideo(
                  activeVideo
                );








              }








            }
          );








        },




        {
          threshold:
            0,




          /*
            Keep playback alive slightly beyond the
            visible viewport so ordinary scrolling
            near the video never causes stop/start
            flicker.
          */
          rootMargin:
            '220px 0px 220px 0px'
        }
      );








    viewportObserver.observe(
      viewport
    );








  }








  /* ===================================================
  TAB VISIBILITY
  =================================================== */








  function handleVisibilityChange() {








    documentIsVisible =
      !document.hidden;








    if (
      !documentIsVisible
    ) {








      pauseVideo(
        activeVideo
      );








      return;








    }








    if (
      !userPaused &&
      viewportIsActive
    ) {








      playVideo(
        activeVideo,
        false
      );








    }








  }








  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange
  );








  /* ===================================================
  INITIAL PLAYBACK
  =================================================== */








  pauseInactiveVideos();








  if (
    activeVideo &&
    activeVideo.muted &&
    activeVideo.paused
  ) {








    playVideo(
      activeVideo,
      false
    );








  }








  updateControl();








  /* ===================================================
  CLEANUP
  =================================================== */








  window.addEventListener(
    'pagehide',




    function () {








      switchToken +=
        1;








      if (
        viewportObserver
      ) {








        viewportObserver.disconnect();








      }








      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );








      registeredVideos.forEach(
        function (video) {








          pauseVideo(
            video
          );








        }
      );








    },




    {
      once:
        true
    }
  );








}());








/* ===================================================
SERVICES — LOADER CYCLE
=================================================== */








(function setupCaseCycle() {








  const section =
    document.querySelector(
      '[data-case-cycle-section]'
    );








  if (!section) {
    return;
  }








  const cycle =
    section.querySelector(
      '[data-case-cycle]'
    );








  if (!cycle) {
    return;
  }








  const tabs =
    Array.from(
      cycle.querySelectorAll(
        '[data-case-cycle-tab]'
      )
    );








  const items =
    Array.from(
      cycle.querySelectorAll(
        '[data-case-cycle-item]'
      )
    );








  const details =
    Array.from(
      cycle.querySelectorAll(
        '[data-case-cycle-detail]'
      )
    );








  const progress =
    cycle.querySelector(
      '[data-case-cycle-progress]'
    );








  if (
    !tabs.length ||
    !items.length ||
    !details.length
  ) {
    return;
  }








  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;








  const duration =
    Number(
      section.dataset.cycleDuration
    ) ||
    5200;








  let activeIndex =
    0;








  let timer =
    null;








  let frameOne =
    null;








  let frameTwo =
    null;








  let isInView =
    false;








  cycle.style.setProperty(
    '--case-cycle-duration',
    `${duration}ms`
  );








  /* ===================================================
  CLEANUP
  =================================================== */








  function clearTimer() {








    if (
      timer !==
      null
    ) {








      window.clearTimeout(
        timer
      );








      timer =
        null;








    }








  }








  function clearFrames() {








    if (
      frameOne !==
      null
    ) {








      window.cancelAnimationFrame(
        frameOne
      );








      frameOne =
        null;








    }








    if (
      frameTwo !==
      null
    ) {








      window.cancelAnimationFrame(
        frameTwo
      );








      frameTwo =
        null;








    }








  }








  /* ===================================================
  DYNAMIC RAIL




  This now works with:
  3 items
  4 items
  5 items
  or more.




  It no longer relies on the old hard-coded 25%.
  =================================================== */








  function updateProgressPosition() {








    if (
      !progress
    ) {
      return;
    }








    const count =
      Math.max(
        1,
        items.length
      );








    const segment =
      100 /
      count;








    progress.style.top =
      `${activeIndex * segment}%`;








    progress.style.height =
      `${segment}%`;








  }








  /* ===================================================
  ACTIVE CONTENT
  =================================================== */








  function applyActiveState() {








    cycle.style.setProperty(
      '--case-cycle-index',
      String(
        activeIndex
      )
    );








    updateProgressPosition();








    items.forEach(
      function (
        item,
        index
      ) {








        item.classList.toggle(
          'is-active',
          index ===
          activeIndex
        );








      }
    );








    tabs.forEach(
      function (
        tab,
        index
      ) {








        const active =
          index ===
          activeIndex;








        tab.setAttribute(
          'aria-expanded',
          String(
            active
          )
        );








      }
    );








    details.forEach(
      function (
        detail,
        index
      ) {








        const active =
          index ===
          activeIndex;








        detail.classList.toggle(
          'is-active',
          active
        );








        detail.setAttribute(
          'aria-hidden',
          String(
            !active
          )
        );








      }
    );








  }








  /* ===================================================
  LOADER RESTART
  =================================================== */








  function restartLoader() {








    clearTimer();




    clearFrames();








    updateProgressPosition();








    cycle.classList.remove(
      'is-running'
    );








    if (
      reducedMotion ||
      !isInView
    ) {
      return;
    }








    /*
      Two frames guarantee a clean CSS animation reset.
    */
    frameOne =
      window.requestAnimationFrame(
        function () {








          frameOne =
            null;








          frameTwo =
            window.requestAnimationFrame(
              function () {








                frameTwo =
                  null;








                if (
                  !isInView
                ) {
                  return;
                }








                cycle.classList.add(
                  'is-running'
                );








                timer =
                  window.setTimeout(
                    function () {








                      setActive(
                        (
                          activeIndex +
                          1
                        ) %
                        items.length
                      );








                    },




                    duration
                  );








              }
            );








        }
      );








  }








  /* ===================================================
  SET ACTIVE
  =================================================== */








  function setActive(
    index
  ) {








    activeIndex =
      (
        (
          index %
          items.length
        ) +
        items.length
      ) %
      items.length;








    applyActiveState();








    restartLoader();








  }








  /* ===================================================
  MANUAL SELECTION
  =================================================== */








  tabs.forEach(
    function (
      tab,
      index
    ) {








      tab.addEventListener(
        'click',




        function () {








          setActive(
            index
          );








        }
      );








    }
  );








  /* ===================================================
  VIEWPORT
  =================================================== */








  const observer =
    new IntersectionObserver(
      function (entries) {








        entries.forEach(
          function (entry) {








            if (
              entry.target !==
              section
            ) {
              return;
            }








            isInView =
              entry.isIntersecting;








            if (
              isInView
            ) {








              restartLoader();








            } else {








              clearTimer();




              clearFrames();








              cycle.classList.remove(
                'is-running'
              );








            }








          }
        );








      },




      {
        threshold:
          0.25
      }
    );








  applyActiveState();








  observer.observe(
    section
  );








  window.addEventListener(
    'pagehide',




    function () {








      clearTimer();




      clearFrames();




      observer.disconnect();








    },




    {
      once:
        true
    }
  );








}());








/* ===================================================
PROCESS / RESULTS




Scroll-linked reversible movement.




Orange:
starts slightly LEFT
moves RIGHT




Results:
starts slightly RIGHT
moves LEFT




When fully in view:
both reach translateX(0)
and touch exactly.




When scrolling upward:
the movement reverses naturally.
=================================================== */








(function setupCaseSplitMotion() {








  const split =
    document.querySelector(
      '[data-case-split]'
    );








  if (!split) {
    return;
  }








  const leftPanel =
    split.querySelector(
      '[data-case-split-left]'
    );








  const rightPanel =
    split.querySelector(
      '[data-case-split-right]'
    );








  if (
    !leftPanel ||
    !rightPanel
  ) {
    return;
  }








  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );








  const mobileQuery =
    window.matchMedia(
      '(max-width: 700px)'
    );








  if (
    reducedMotion.matches
  ) {








    leftPanel.style.setProperty(
      '--case-split-left-x',
      '0px'
    );








    rightPanel.style.setProperty(
      '--case-split-right-x',
      '0px'
    );








    return;
  }








  let frame =
    null;








  function clamp(
    value,
    minimum,
    maximum
  ) {








    return Math.min(
      maximum,
      Math.max(
        minimum,
        value
      )
    );








  }








  function renderSplitMotion() {








    frame =
      null;








    /*
      No horizontal split motion once the panels stack.
    */
    if (
      mobileQuery.matches
    ) {








      leftPanel.style.setProperty(
        '--case-split-left-x',
        '0px'
      );








      rightPanel.style.setProperty(
        '--case-split-right-x',
        '0px'
      );








      return;








    }








    const rect =
      split.getBoundingClientRect();








    const viewportHeight =
      window.innerHeight ||
      document.documentElement.clientHeight;








    const startLine =
      viewportHeight *
      0.92;








    const finishLine =
      viewportHeight *
      0.46;








    const rawProgress =
      (
        startLine -
        rect.top
      ) /
      (
        startLine -
        finishLine
      );








    const progress =
      clamp(
        rawProgress,
        0,
        1
      );








    const maximumShift =
      Math.min(
        68,
        Math.max(
          36,
          window.innerWidth *
          0.045
        )
      );








    const remainingShift =
      maximumShift *
      (
        1 -
        progress
      );








    leftPanel.style.setProperty(
      '--case-split-left-x',
      `${-remainingShift.toFixed(2)}px`
    );








    rightPanel.style.setProperty(
      '--case-split-right-x',
      `${remainingShift.toFixed(2)}px`
    );








  }








  function requestSplitMotion() {








    if (
      frame !==
      null
    ) {
      return;
    }








    frame =
      window.requestAnimationFrame(
        renderSplitMotion
      );








  }








  renderSplitMotion();








  window.addEventListener(
    'scroll',
    requestSplitMotion,
    {
      passive:
        true
    }
  );








  window.addEventListener(
    'resize',
    requestSplitMotion,
    {
      passive:
        true
    }
  );








  window.addEventListener(
    'pageshow',
    requestSplitMotion
  );








  if (
    typeof mobileQuery.addEventListener ===
    'function'
  ) {








    mobileQuery.addEventListener(
      'change',
      requestSplitMotion
    );








  }








  window.addEventListener(
    'pagehide',




    function () {








      if (
        frame !==
        null
      ) {








        window.cancelAnimationFrame(
          frame
        );








        frame =
          null;








      }








      window.removeEventListener(
        'scroll',
        requestSplitMotion
      );








      window.removeEventListener(
        'resize',
        requestSplitMotion
      );








      window.removeEventListener(
        'pageshow',
        requestSplitMotion
      );








      if (
        typeof mobileQuery.removeEventListener ===
        'function'
      ) {








        mobileQuery.removeEventListener(
          'change',
          requestSplitMotion
        );








      }








    },




    {
      once:
        true
    }
  );








}());








/* ===================================================
SCROLL REVEALS
=================================================== */








(function setupCaseReveals() {








  const elements =
    Array.from(
      document.querySelectorAll(
        '[data-reveal]'
      )
    );








  if (
    !elements.length
  ) {
    return;
  }








  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;








  if (
    reducedMotion
  ) {








    elements.forEach(
      function (element) {








        element.classList.add(
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
        threshold:
          0.12,




        rootMargin:
          '0px 0px -6% 0px'
      }
    );








  elements.forEach(
    function (element) {








      observer.observe(
        element
      );








    }
  );








  window.addEventListener(
    'pagehide',




    function () {








      observer.disconnect();








    },




    {
      once:
        true
    }
  );








}());
