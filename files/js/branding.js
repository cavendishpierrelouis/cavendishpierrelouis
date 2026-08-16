'use strict';


/* ===================================================
   VISIBLE ARTWORK ALIGNMENT

   The PNG canvas can be perfectly centered while
   the actual visible logo inside that PNG is not.

   This measures the NON-TRANSPARENT artwork and
   moves that artwork to the mathematical center
   of its stage.

   IMPORTANT:

   - NO scaling
   - NO resizing
   - NO brand-specific rules
   - NO light/dark size changes
   - ONLY X/Y positioning
=================================================== */

(function setupVisibleArtworkAlignment() {

  const images =
    Array.from(
      document.querySelectorAll(
        '.identity-asset__visual .theme-logo > img'
      )
    );


  if (!images.length) {
    return;
  }


  const cache =
    new WeakMap();


  const MAX_SAMPLE_SIZE = 600;

  const ALPHA_THRESHOLD = 8;


  /* =================================================
     READ VISIBLE PIXEL BOUNDS
  ================================================= */

  function getVisibleBounds(image) {

    if (cache.has(image)) {
      return cache.get(image);
    }


    const naturalWidth =
      image.naturalWidth;


    const naturalHeight =
      image.naturalHeight;


    if (
      !naturalWidth ||
      !naturalHeight
    ) {
      return null;
    }


    const scale =
      Math.min(
        1,
        MAX_SAMPLE_SIZE /
        Math.max(
          naturalWidth,
          naturalHeight
        )
      );


    const width =
      Math.max(
        1,
        Math.round(
          naturalWidth *
          scale
        )
      );


    const height =
      Math.max(
        1,
        Math.round(
          naturalHeight *
          scale
        )
      );


    const canvas =
      document.createElement(
        'canvas'
      );


    canvas.width =
      width;


    canvas.height =
      height;


    const context =
      canvas.getContext(
        '2d',
        {
          willReadFrequently: true
        }
      );


    if (!context) {
      return null;
    }


    try {

      context.clearRect(
        0,
        0,
        width,
        height
      );


      context.drawImage(
        image,
        0,
        0,
        width,
        height
      );


      const pixels =
        context.getImageData(
          0,
          0,
          width,
          height
        ).data;


      let minX = width;
      let minY = height;

      let maxX = -1;
      let maxY = -1;


      for (
        let y = 0;
        y < height;
        y += 1
      ) {

        for (
          let x = 0;
          x < width;
          x += 1
        ) {

          const alpha =
            pixels[
              (
                y *
                width +
                x
              ) *
              4 +
              3
            ];


          if (
            alpha <=
            ALPHA_THRESHOLD
          ) {
            continue;
          }


          if (x < minX) {
            minX = x;
          }


          if (x > maxX) {
            maxX = x;
          }


          if (y < minY) {
            minY = y;
          }


          if (y > maxY) {
            maxY = y;
          }

        }

      }


      if (
        maxX < minX ||
        maxY < minY
      ) {
        return null;
      }


      const result = {

        minX:
          minX / scale,

        minY:
          minY / scale,

        maxX:
          maxX / scale,

        maxY:
          maxY / scale,

        naturalWidth,

        naturalHeight

      };


      cache.set(
        image,
        result
      );


      return result;

    } catch (error) {

      return null;

    }

  }


  /* =================================================
     CENTER ONE IMAGE

     We calculate where the visible artwork center is
     relative to the true image center.

     Then convert that difference into CSS pixels.

     Example:

     PNG canvas center
               ↓
          ┌──────────┐
          │          │
          │   LOGO   │   ← visible artwork too high
          │          │
          │          │
          └──────────┘

     JS shifts the PNG slightly downward until:

          ┌──────────┐
          │          │
          │          │
          │   LOGO   │   ← exact center
          │          │
          └──────────┘
  ================================================= */

  function centerImage(image) {

    const bounds =
      getVisibleBounds(
        image
      );


    if (!bounds) {

      image.style.setProperty(
        '--identity-art-x',
        '0px'
      );


      image.style.setProperty(
        '--identity-art-y',
        '0px'
      );


      return;

    }


    const wrapper =
      image.closest(
        '.theme-logo'
      );


    if (!wrapper) {
      return;
    }


    const wrapperRect =
      wrapper.getBoundingClientRect();


    if (
      !wrapperRect.width ||
      !wrapperRect.height
    ) {
      return;
    }


    /*
       Because object-fit is contain, calculate
       the actual scale used by the image.
    */

    const fitScale =
      Math.min(
        wrapperRect.width /
        bounds.naturalWidth,

        wrapperRect.height /
        bounds.naturalHeight
      );


    /*
       Center of full PNG canvas.
    */

    const canvasCenterX =
      bounds.naturalWidth / 2;


    const canvasCenterY =
      bounds.naturalHeight / 2;


    /*
       Center of visible artwork.
    */

    const artworkCenterX =
      (
        bounds.minX +
        bounds.maxX
      ) / 2;


    const artworkCenterY =
      (
        bounds.minY +
        bounds.maxY
      ) / 2;


    /*
       Difference between visible center
       and canvas center.
    */

    const differenceX =
      artworkCenterX -
      canvasCenterX;


    const differenceY =
      artworkCenterY -
      canvasCenterY;


    /*
       Move in the OPPOSITE direction.

       If artwork is 20px too high,
       differenceY is negative,
       therefore correction becomes positive
       and moves it downward.
    */

    const correctionX =
      -differenceX *
      fitScale;


    const correctionY =
      -differenceY *
      fitScale;


    image.style.setProperty(
      '--identity-art-x',
      correctionX.toFixed(2) +
      'px'
    );


    image.style.setProperty(
      '--identity-art-y',
      correctionY.toFixed(2) +
      'px'
    );

  }


  /* =================================================
     ALIGN ALL LOGOS
  ================================================= */

  function alignAll() {

    images.forEach(
      function (image) {

        if (
          image.complete &&
          image.naturalWidth
        ) {

          centerImage(
            image
          );

        }

      }
    );

  }


  /* =================================================
     WAIT FOR EVERY IMAGE
  ================================================= */

  images.forEach(
    function (image) {

      if (
        image.complete &&
        image.naturalWidth
      ) {

        centerImage(
          image
        );


        return;
      }


      image.addEventListener(
        'load',
        function () {

          centerImage(
            image
          );

        },
        {
          once: true
        }
      );

  });


  /* =================================================
     RUN AGAIN AFTER LAYOUT SETTLES
  ================================================= */

  window.addEventListener(
    'load',
    function () {

      requestAnimationFrame(
        function () {

          requestAnimationFrame(
            alignAll
          );

        }
      );

    },
    {
      once: true
    }
  );


  /* =================================================
     RESPONSIVE RECALCULATION

     Only positioning is recalculated.
     Logo dimensions are untouched.
  ================================================= */

  let alignmentTimer = null;


  window.addEventListener(
    'resize',
    function () {

      window.clearTimeout(
        alignmentTimer
      );


      alignmentTimer =
        window.setTimeout(
          alignAll,
          120
        );

    },
    {
      passive: true
    }
  );

}());


/* ===================================================
   IDENTITY MARQUEE

   This script NEVER resizes logos.
=================================================== */

(function setupIdentityMarquee() {

  const marquee =
    document.querySelector(
      '[data-logo-marquee]'
    );


  const toggle =
    document.querySelector(
      '[data-logo-toggle]'
    );


  if (!marquee) {
    return;
  }


  const track =
    marquee.querySelector(
      '.identity-marquee__track'
    );


  if (!track) {
    return;
  }


  const sourceGroup =
    track.querySelector(
      '.identity-marquee__group'
    );


  if (!sourceGroup) {
    return;
  }


  /* =================================================
     SAVE ORIGINAL ITEMS
  ================================================= */

  const originalItems =
    Array.from(
      sourceGroup.children
    )
    .filter(function (item) {

      return item.classList.contains(
        'identity-marquee__item'
      );

    })
    .map(function (item) {

      return item.cloneNode(true);

    });


  if (!originalItems.length) {
    return;
  }


  /* =================================================
     ACCESSIBLE DUPLICATES
  ================================================= */

  function makeDecorative(node) {

    node.setAttribute(
      'aria-hidden',
      'true'
    );


    node
      .querySelectorAll('img')
      .forEach(function (image) {

        image.setAttribute(
          'alt',
          ''
        );

      });


    return node;

  }


  /* =================================================
     CREATE GROUP
  ================================================= */

  function createGroup() {

    const group =
      document.createElement(
        'div'
      );


    group.className =
      'identity-marquee__group';


    originalItems.forEach(
      function (item) {

        group.appendChild(
          item.cloneNode(true)
        );

      }
    );


    return group;

  }


  /* =================================================
     FILL VIEWPORT
  ================================================= */

  function fillGroup(group) {

    const minimumWidth =
      window.innerWidth *
      1.2;


    let safety = 0;


    while (
      group.scrollWidth <
        minimumWidth &&
      safety < 10
    ) {

      originalItems.forEach(
        function (item) {

          const copy =
            item.cloneNode(true);


          makeDecorative(
            copy
          );


          group.appendChild(
            copy
          );

        }
      );


      safety += 1;

    }

  }


  /* =================================================
     BUILD SEAMLESS LOOP
  ================================================= */

  function buildMarquee() {

    const wasPaused =
      marquee.classList.contains(
        'is-paused'
      );


    track.innerHTML = '';


    const firstGroup =
      createGroup();


    track.appendChild(
      firstGroup
    );


    fillGroup(
      firstGroup
    );


    const secondGroup =
      firstGroup.cloneNode(
        true
      );


    makeDecorative(
      secondGroup
    );


    track.appendChild(
      secondGroup
    );


    const groupWidth =
      firstGroup.scrollWidth;


    const pixelsPerSecond =
      42;


    const duration =
      Math.max(
        26,
        groupWidth /
        pixelsPerSecond
      );


    track.style.setProperty(
      '--identity-marquee-duration',
      duration.toFixed(2) +
      's'
    );


    marquee.classList.toggle(
      'is-paused',
      wasPaused
    );

  }


  /* =================================================
     PAUSE / PLAY
  ================================================= */

  function setPaused(paused) {

    marquee.classList.toggle(
      'is-paused',
      paused
    );


    if (!toggle) {
      return;
    }


    toggle.classList.toggle(
      'is-paused',
      paused
    );


    toggle.setAttribute(
      'aria-pressed',
      String(paused)
    );


    toggle.setAttribute(
      'aria-label',
      paused
        ? 'Play logo animation'
        : 'Pause logo animation'
    );


    toggle.setAttribute(
      'title',
      paused
        ? 'Play logo animation'
        : 'Pause logo animation'
    );

  }


  const reducedMotion =
    window.matchMedia &&
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  buildMarquee();


  if (reducedMotion) {

    setPaused(
      true
    );


    if (toggle) {
      toggle.hidden = true;
    }


    return;

  }


  setPaused(
    false
  );


  if (toggle) {

    toggle.addEventListener(
      'click',
      function () {

        setPaused(
          !marquee.classList.contains(
            'is-paused'
          )
        );

      }
    );

  }


  /* =================================================
     RESPONSIVE MARQUEE REBUILD
  ================================================= */

  let resizeTimer = null;

  let previousWidth =
    window.innerWidth;


  window.addEventListener(
    'resize',
    function () {

      const currentWidth =
        window.innerWidth;


      if (
        Math.abs(
          currentWidth -
          previousWidth
        ) < 32
      ) {
        return;
      }


      previousWidth =
        currentWidth;


      window.clearTimeout(
        resizeTimer
      );


      resizeTimer =
        window.setTimeout(
          buildMarquee,
          150
        );

    },
    {
      passive: true
    }
  );

}());


/* ===================================================
   BRANDING CARD STACK ORDER
=================================================== */

(function setupIdentityStack() {

  const cards =
    Array.from(
      document.querySelectorAll(
        '.identity-stack > .identity-card'
      )
    );


  cards.forEach(
    function (
      card,
      index
    ) {

      card.style.zIndex =
        String(
          index + 1
        );

    }
  );

  document.querySelectorAll(
    '[data-branding-project-count]'
  ).forEach(
    function (count) {
      const total = cards.length;

      count.textContent = String(total).padStart(2, '0');
      count.setAttribute(
        'aria-label',
        total + (total === 1 ? ' logo project' : ' logo projects')
      );
    }
  );

}());
