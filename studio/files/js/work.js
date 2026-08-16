'use strict';


/* ===================================================
  PROJECT DATA

  Replace assets/work/changethisimage.png with each
  real project image when ready.

  Replace the case hrefs when the final case pages
  are in place.
=================================================== */


const WORK_PROJECTS = [
  {
    name: 'CavBot',
    category: 'Software',
    year: '2025',
    detail: 'Website intelligence',
    location: 'New York',
    image: 'assets/projects/cavbot-1.jpg',
    href: 'work/cavbot.html'
  },
  {
    name: 'CavAi',
    category: 'Software',
    year: '2026',
    detail: 'AI product',
    location: 'New York',
    image: 'assets/projects/cavai.jpg',
    href: 'work/cavai.html'
  },
  {
    name: 'Lions Jungle',
    category: 'Website',
    year: '2026',
    detail: 'Football club',
    location: 'New York',
    image: 'assets/projects/lions-jungle.jpg',
    href: 'work/lions-jungle.html'
  },
  {
    name: 'Daryna Volianiuk',
    category: 'Website',
    year: '2026',
    detail: 'Research portfolio',
    location: 'Poland',
    image: 'assets/projects/daryna.jpg',
    href: 'work/daryna-volianiuk.html'
  }
];




/* ===================================================
  LIVE NEW YORK CLOCK
=================================================== */


(function setupWorkClock() {
  const clock = document.querySelector('[data-work-clock]');


  if (!clock) {
    return;
  }


  let timer = null;


  const formatter = new Intl.DateTimeFormat('en-US', {
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
    const match = parts.find(function (part) {
      return part.type === type;
    });


    return match
      ? match.value
      : '';
  }




  function getOffset(date, parts) {
    const zonedTimestamp = Date.UTC(
      Number(getPart(parts, 'year')),
      Number(getPart(parts, 'month')) - 1,
      Number(getPart(parts, 'day')),
      Number(getPart(parts, 'hour')),
      Number(getPart(parts, 'minute')),
      Number(getPart(parts, 'second'))
    );


    const totalMinutes = Math.round(
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
      Math.floor(absoluteMinutes / 60);


    const minutes =
      absoluteMinutes % 60;


    return minutes === 0
      ? `GMT${sign}${hours}`
      : `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
  }




  function renderClock() {
    const now = new Date();


    const parts =
      formatter.formatToParts(now);


    const time = [
      getPart(parts, 'hour'),
      getPart(parts, 'minute'),
      getPart(parts, 'second')
    ].join(':');


    clock.textContent =
      `${time} ${getOffset(now, parts)}`;


    clock.dateTime =
      now.toISOString();


    timer = window.setTimeout(
      renderClock,
      1000 - now.getMilliseconds() + 8
    );
  }




  renderClock();




  window.addEventListener(
    'pagehide',
    function () {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    },
    {
      once: true
    }
  );
}());




/* ===================================================
  RIGHT MENU
=================================================== */


(function setupWorkMenu() {
  const toggle =
    document.querySelector('[data-menu-toggle]');


  const panel =
    document.querySelector('[data-menu-panel]');


  if (
    !toggle ||
    !panel
  ) {
    return;
  }




  let isOpen = false;
  let closeTimer = null;




  function openMenu() {
    if (isOpen) {
      return;
    }


    isOpen = true;


    document.body.classList.add(
      'is-menu-open'
    );


    toggle.classList.remove(
      'is-closing'
    );


    toggle.classList.add(
      'is-open'
    );


    toggle.setAttribute(
      'aria-expanded',
      'true'
    );


    toggle.setAttribute(
      'aria-label',
      'Close menu'
    );


    panel.classList.add(
      'is-open'
    );


    panel.setAttribute(
      'aria-hidden',
      'false'
    );
  }




  function closeMenu() {
    if (!isOpen) {
      return;
    }


    isOpen = false;


    document.body.classList.remove(
      'is-menu-open'
    );


    toggle.classList.remove(
      'is-open'
    );


    toggle.classList.add(
      'is-closing'
    );


    toggle.setAttribute(
      'aria-expanded',
      'false'
    );


    toggle.setAttribute(
      'aria-label',
      'Open menu'
    );


    panel.classList.remove(
      'is-open'
    );


    panel.setAttribute(
      'aria-hidden',
      'true'
    );


    window.clearTimeout(
      closeTimer
    );


    closeTimer =
      window.setTimeout(
        function () {
          toggle.classList.remove(
            'is-closing'
          );
        },
        430
      );
  }




  toggle.addEventListener(
    'click',
    function () {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }
  );




  document.addEventListener(
    'keydown',
    function (event) {
      if (
        event.key === 'Escape' &&
        isOpen
      ) {
        closeMenu();
        toggle.focus();
      }
    }
  );




  panel.addEventListener(
    'click',
    function (event) {
      if (
        event.target.closest('a')
      ) {
        closeMenu();
      }
    }
  );
}());




/* ===================================================
  INFINITE PROJECT REEL
=================================================== */


(function setupProjectReel() {
  const reel =
    document.querySelector(
      '[data-project-reel]'
    );


  const track =
    document.querySelector(
      '[data-project-track]'
    );


  const media =
    document.querySelector(
      '[data-project-case]'
    );


  const image =
    document.querySelector(
      '[data-project-image]'
    );


  const category =
    document.querySelector(
      '[data-project-category]'
    );


  const year =
    document.querySelector(
      '[data-project-year]'
    );


  const detail =
    document.querySelector(
      '[data-project-detail]'
    );


  const location =
    document.querySelector(
      '[data-project-location]'
    );




  if (
    !reel ||
    !track ||
    !media ||
    !image ||
    !category ||
    !year ||
    !detail ||
    !location ||
    !WORK_PROJECTS.length
  ) {
    return;
  }




  const hoverMedia =
    window.matchMedia(
      '(hover: hover)'
    );


  const reducedMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;




  let activeIndex = 0;
  let hoverIndex = null;


  let step = 84;


  let currentOffset = 0;
  let targetOffset = 0;


  let animationFrame = null;
  let previousFrameTime = null;


  let settleTimer = null;
  let stageTimer = null;


  let touchStartY = null;
  let touchLastY = null;


  let lastRenderedStageIndex = -1;




  /* ---------------------------------------------------
    HELPERS
  --------------------------------------------------- */


  function clamp(value, min, max) {
    return Math.min(
      Math.max(value, min),
      max
    );
  }




  function getProjectIndex(item) {
    if (!item) {
      return activeIndex;
    }


    const value =
      Number(
        item.dataset.projectIndex
      );


    return Number.isFinite(value)
      ? value
      : activeIndex;
  }




  function getFirstProjectIndex() {
    return getProjectIndex(
      track.firstElementChild
    );
  }




  function syncActiveProject() {
    const nextIndex =
      getFirstProjectIndex();


    if (
      nextIndex === activeIndex
    ) {
      return;
    }


    activeIndex =
      nextIndex;


    if (hoverIndex === null) {
      renderStage(
        activeIndex,
        true
      );
    }


    renderActiveNames();
  }




  /* ---------------------------------------------------
    PROJECT BUTTON
  --------------------------------------------------- */


  function createProjectButton(
    project,
    projectIndex
  ) {
    const button =
      document.createElement(
        'button'
      );


    button.className =
      'work-project';


    button.type =
      'button';


    button.dataset.projectIndex =
      String(projectIndex);


    button.setAttribute(
      'aria-label',
      `Preview ${project.name}`
    );




    const label =
      document.createElement(
        'span'
      );


    label.textContent =
      project.name;


    button.appendChild(
      label
    );




    button.addEventListener(
      'mouseenter',
      function () {
        if (!hoverMedia.matches) {
          return;
        }


        hoverIndex =
          projectIndex;


        renderStage(
          projectIndex,
          true
        );


        renderActiveNames();
      }
    );




    button.addEventListener(
      'mouseleave',
      function () {
        hoverIndex =
          null;


        renderStage(
          activeIndex,
          true
        );


        renderActiveNames();
      }
    );




    button.addEventListener(
      'focus',
      function () {
        hoverIndex =
          projectIndex;


        renderStage(
          projectIndex,
          true
        );


        renderActiveNames();
      }
    );




    button.addEventListener(
      'blur',
      function () {
        hoverIndex =
          null;


        renderStage(
          activeIndex,
          true
        );


        renderActiveNames();
      }
    );




    button.addEventListener(
      'click',
      function () {
        const selectedProject =
          WORK_PROJECTS[
            projectIndex
          ];


        if (
          selectedProject &&
          selectedProject.href
        ) {
          window.location.href =
            selectedProject.href;
        }
      }
    );




    return button;
  }




  /* ---------------------------------------------------
    INITIAL TRACK

  --------------------------------------------------- */


  function buildTrack() {
    const fragment =
      document.createDocumentFragment();


    WORK_PROJECTS.forEach(
      function (project, projectIndex) {
        fragment.appendChild(
          createProjectButton(
            project,
            projectIndex
          )
        );
      }
    );


    track.replaceChildren(
      fragment
    );
  }




  /* ---------------------------------------------------
    MEASURE ACTUAL DISTANCE BETWEEN PROJECTS
  --------------------------------------------------- */


  function measureStep() {
    const items =
      track.querySelectorAll(
        '.work-project'
      );




    if (items.length >= 2) {
      const first =
        items[0]
          .getBoundingClientRect();


      const second =
        items[1]
          .getBoundingClientRect();


      const measured =
        Math.abs(
          second.top -
          first.top
        );


      if (measured > 1) {
        step = measured;
        return;
      }
    }




    const firstItem =
      items[0];


    if (firstItem) {
      step =
        firstItem
          .getBoundingClientRect()
          .height || 84;
    }
  }




  /* ---------------------------------------------------
    ACTIVE NAME
  --------------------------------------------------- */


  function renderActiveNames() {
    const selectedIndex =
      hoverIndex !== null
        ? hoverIndex
        : activeIndex;




    track
      .querySelectorAll(
        '.work-project'
      )
      .forEach(
        function (item) {
          const itemIndex =
            getProjectIndex(
              item
            );


          const isActive =
            itemIndex ===
            selectedIndex;


          item.classList.toggle(
            'is-active',
            isActive
          );


          item.setAttribute(
            'aria-pressed',
            String(isActive)
          );
        }
      );
  }




  /* ---------------------------------------------------
    PROJECT IMAGE / META
  --------------------------------------------------- */


  function renderStage(
    index,
    animate
  ) {
    const project =
      WORK_PROJECTS[index];


    if (!project) {
      return;
    }




    if (
      index ===
      lastRenderedStageIndex
    ) {
      return;
    }




    lastRenderedStageIndex =
      index;




    category.textContent =
      project.category;


    year.textContent =
      project.year;


    detail.textContent =
      project.detail;


    location.textContent =
      project.location;




    media.href =
      project.href;


    media.setAttribute(
      'aria-label',
      `Open ${project.name} case`
    );




    if (
      reducedMotion ||
      !animate ||
      image.getAttribute('src') ===
        project.image
    ) {
      image.src =
        project.image;


      image.alt =
        `${project.name} project preview`;


      media.classList.remove(
        'is-changing'
      );


      return;
    }




    media.classList.add(
      'is-changing'
    );




    window.clearTimeout(
      stageTimer
    );




    stageTimer =
      window.setTimeout(
        function () {
          image.src =
            project.image;


          image.alt =
            `${project.name} project preview`;


          window.requestAnimationFrame(
            function () {
              media.classList.remove(
                'is-changing'
              );
            }
          );
        },
        120
      );
  }




  /* ---------------------------------------------------
    TRACK TRANSFORM

    No CSS transition.
    requestAnimationFrame owns all movement.
  --------------------------------------------------- */


  function applyTrackTransform() {
    track.style.transform =
      `translate3d(
        0,
        calc(-50% + ${currentOffset.toFixed(3)}px),
        0
      )`;
  }




  /* ---------------------------------------------------
    RECYCLE NODES

    Visual position is preserved exactly.
    The same node moves to the opposite edge.
  --------------------------------------------------- */


  function recycleForward() {
    const first =
      track.firstElementChild;


    if (!first) {
      return;
    }




    track.appendChild(
      first
    );




    currentOffset +=
      step;


    targetOffset +=
      step;


    syncActiveProject();
  }




  function recycleBackward() {
    const last =
      track.lastElementChild;


    if (!last) {
      return;
    }




    track.insertBefore(
      last,
      track.firstElementChild
    );




    currentOffset -=
      step;


    targetOffset -=
      step;


    syncActiveProject();
  }




  function normalizeLoop() {
    while (
      currentOffset <=
      -step
    ) {
      recycleForward();
    }




    while (
      currentOffset >=
      step
    ) {
      recycleBackward();
    }
  }




  /* ---------------------------------------------------
    SMOOTH ANIMATION ENGINE

    Preserves the exact smoothing you already liked.
  --------------------------------------------------- */


  function animate(timestamp) {
    animationFrame = null;




    if (
      previousFrameTime ===
      null
    ) {
      previousFrameTime =
        timestamp;
    }




    const deltaTime =
      Math.min(
        40,
        timestamp -
        previousFrameTime
      );




    previousFrameTime =
      timestamp;




    const response =
      1 -
      Math.exp(
        -deltaTime / 92
      );




    currentOffset +=
      (
        targetOffset -
        currentOffset
      ) * response;




    normalizeLoop();


    applyTrackTransform();




    const remaining =
      Math.abs(
        targetOffset -
        currentOffset
      );




    if (
      remaining >
      0.035
    ) {
      animationFrame =
        window.requestAnimationFrame(
          animate
        );


      return;
    }




    currentOffset =
      targetOffset;


    normalizeLoop();


    applyTrackTransform();


    previousFrameTime =
      null;
  }




  function requestMotionFrame() {
    if (
      reducedMotion ||
      animationFrame !== null
    ) {
      return;
    }




    previousFrameTime =
      null;




    animationFrame =
      window.requestAnimationFrame(
        animate
      );
  }




  /* ---------------------------------------------------
    SETTLE TO THE NEAREST PROJECT
  --------------------------------------------------- */


  function settleToProject() {
    window.clearTimeout(
      settleTimer
    );




    settleTimer =
      window.setTimeout(
        function () {
          if (
            hoverIndex !== null ||
            !step
          ) {
            return;
          }




          const nearestStep =
            Math.round(
              targetOffset /
              step
            ) * step;




          targetOffset =
            nearestStep;




          if (reducedMotion) {
            currentOffset =
              targetOffset;


            normalizeLoop();


            applyTrackTransform();


            return;
          }




          requestMotionFrame();
        },
        110
      );
  }




  /* ---------------------------------------------------
    NORMALIZE WHEEL INPUT
  --------------------------------------------------- */


  function normalizeWheelDelta(
    event
  ) {
    let delta =
      event.deltaY;




    if (
      event.deltaMode === 1
    ) {
      delta *= 16;
    }




    if (
      event.deltaMode === 2
    ) {
      delta *=
        window.innerHeight;
    }




    return clamp(
      delta,
      -110,
      110
    );
  }




  function handleWheel(event) {
    if (
      document.body.classList.contains(
        'is-menu-open'
      )
    ) {
      return;
    }




    event.preventDefault();




    const delta =
      normalizeWheelDelta(
        event
      );




    targetOffset -=
      delta * 0.72;




    const maximumLead =
      step * 2.35;




    targetOffset =
      clamp(
        targetOffset,
        currentOffset -
          maximumLead,
        currentOffset +
          maximumLead
      );




    if (reducedMotion) {
      currentOffset =
        targetOffset;


      normalizeLoop();


      applyTrackTransform();
    } else {
      requestMotionFrame();
    }




    settleToProject();
  }




  /* ---------------------------------------------------
    KEYBOARD
  --------------------------------------------------- */


  function moveOneProject(
    direction
  ) {
    if (!step) {
      return;
    }




    const nearest =
      Math.round(
        targetOffset /
        step
      ) * step;




    targetOffset =
      nearest -
      (
        direction *
        step
      );




    if (reducedMotion) {
      currentOffset =
        targetOffset;


      normalizeLoop();


      applyTrackTransform();


      return;
    }




    requestMotionFrame();
  }




  function handleKeydown(event) {
    if (
      document.body.classList.contains(
        'is-menu-open'
      )
    ) {
      return;
    }




    if (
      event.key ===
        'ArrowDown' ||
      event.key ===
        'PageDown'
    ) {
      event.preventDefault();


      moveOneProject(
        1
      );


      return;
    }




    if (
      event.key ===
        'ArrowUp' ||
      event.key ===
        'PageUp'
    ) {
      event.preventDefault();


      moveOneProject(
        -1
      );
    }
  }




  /* ---------------------------------------------------
    TOUCH
  --------------------------------------------------- */


  function handleTouchStart(event) {
    if (
      !event.touches.length ||
      document.body.classList.contains(
        'is-menu-open'
      )
    ) {
      return;
    }




    touchStartY =
      event.touches[0]
        .clientY;


    touchLastY =
      touchStartY;




    window.clearTimeout(
      settleTimer
    );
  }




  function handleTouchMove(event) {
    if (
      touchLastY === null ||
      !event.touches.length ||
      document.body.classList.contains(
        'is-menu-open'
      )
    ) {
      return;
    }




    const currentY =
      event.touches[0]
        .clientY;




    const delta =
      currentY -
      touchLastY;




    touchLastY =
      currentY;




    targetOffset +=
      delta;




    if (reducedMotion) {
      currentOffset =
        targetOffset;


      normalizeLoop();


      applyTrackTransform();
    } else {
      requestMotionFrame();
    }




    event.preventDefault();
  }




  function handleTouchEnd() {
    touchStartY =
      null;


    touchLastY =
      null;


    settleToProject();
  }




  /* ---------------------------------------------------
    INITIALIZE
  --------------------------------------------------- */


  buildTrack();


  measureStep();


  activeIndex = 0;
  hoverIndex = null;


  renderStage(
    activeIndex,
    false
  );


  renderActiveNames();


  applyTrackTransform();




  /* ---------------------------------------------------
    EVENTS
  --------------------------------------------------- */


  window.addEventListener(
    'wheel',
    handleWheel,
    {
      passive: false
    }
  );




  window.addEventListener(
    'keydown',
    handleKeydown
  );




  reel.addEventListener(
    'touchstart',
    handleTouchStart,
    {
      passive: true
    }
  );




  reel.addEventListener(
    'touchmove',
    handleTouchMove,
    {
      passive: false
    }
  );




  reel.addEventListener(
    'touchend',
    handleTouchEnd,
    {
      passive: true
    }
  );




  reel.addEventListener(
    'touchcancel',
    handleTouchEnd,
    {
      passive: true
    }
  );




  window.addEventListener(
    'resize',
    function () {
      measureStep();


      currentOffset = 0;
      targetOffset = 0;


      applyTrackTransform();


      activeIndex =
        getFirstProjectIndex();


      hoverIndex = null;


      renderStage(
        activeIndex,
        false
      );


      renderActiveNames();
    }
  );




  window.addEventListener(
    'pagehide',
    function () {
      window.clearTimeout(
        settleTimer
      );


      window.clearTimeout(
        stageTimer
      );




      if (
        animationFrame !== null
      ) {
        window.cancelAnimationFrame(
          animationFrame
        );


        animationFrame = null;
      }
    },
    {
      once: true
    }
  );
}());
