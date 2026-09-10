'use strict';


/* ===================================================
   VISIBLE ARTWORK ALIGNMENT

   PNG files often contain different amounts of
   transparent space.

   This script measures the actual painted pixels
   inside each card image and mathematically centers
   those pixels inside the shared logo stage.

   IMPORTANT:

   JS ONLY owns:
   --identity-art-x
   --identity-art-y

   CSS ONLY owns:
   --identity-manual-x
   --identity-manual-y

   No resizing.
   No scaling.
   No brand-specific JS positioning.
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


  const MAX_SAMPLE_SIZE =
    600;


  const ALPHA_THRESHOLD =
    8;


  /* =================================================
     READ VISIBLE PIXEL BOUNDS
  ================================================= */

  function getVisibleBounds(
    image
  ) {


    if (
      cache.has(
        image
      )
    ) {

      return cache.get(
        image
      );
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
          willReadFrequently:
            true
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


      let minX =
        width;


      let minY =
        height;


      let maxX =
        -1;


      let maxY =
        -1;


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


          if (
            x < minX
          ) {

            minX =
              x;
          }


          if (
            x > maxX
          ) {

            maxX =
              x;
          }


          if (
            y < minY
          ) {

            minY =
              y;
          }


          if (
            y > maxY
          ) {

            maxY =
              y;
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
          minX /
          scale,

        minY:
          minY /
          scale,

        maxX:
          maxX /
          scale,

        maxY:
          maxY /
          scale,

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
  ================================================= */

  function centerImage(
    image
  ) {


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


    /* -----------------------------------------------
       object-fit: contain
    ----------------------------------------------- */

    const fitScale =
      Math.min(

        wrapperRect.width /
        bounds.naturalWidth,

        wrapperRect.height /
        bounds.naturalHeight

      );


    /* -----------------------------------------------
       Full PNG canvas center
    ----------------------------------------------- */

    const canvasCenterX =
      bounds.naturalWidth /
      2;


    const canvasCenterY =
      bounds.naturalHeight /
      2;


    /* -----------------------------------------------
       Visible painted artwork center
    ----------------------------------------------- */

    const artworkCenterX =
      (
        bounds.minX +
        bounds.maxX
      ) /
      2;


    const artworkCenterY =
      (
        bounds.minY +
        bounds.maxY
      ) /
      2;


    /* -----------------------------------------------
       Difference
    ----------------------------------------------- */

    const differenceX =
      artworkCenterX -
      canvasCenterX;


    const differenceY =
      artworkCenterY -
      canvasCenterY;


    /* -----------------------------------------------
       Opposite-direction correction
    ----------------------------------------------- */

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
     ALIGN ALL CARD IMAGES
  ================================================= */

  function alignAll() {


    images.forEach(
      function (
        image
      ) {


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
     WAIT FOR IMAGES
  ================================================= */

  images.forEach(
    function (
      image
    ) {


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
          once:
            true
        }
      );

    }
  );


  /* =================================================
     LAYOUT SETTLE
  ================================================= */

  window.addEventListener(
    'load',

    function () {


      window.requestAnimationFrame(
        function () {


          window.requestAnimationFrame(
            alignAll
          );

        }
      );

    },

    {
      once:
        true
    }
  );


  /* =================================================
     THEME CHANGES

     This is useful because the dark/light PNG may
     have slightly different transparent bounds.

     When your theme system changes data-theme,
     we measure the active artwork again.
  ================================================= */

  const themeObserver =
    new MutationObserver(
      function (
        mutations
      ) {


        const themeChanged =
          mutations.some(
            function (
              mutation
            ) {


              return (
                mutation.type ===
                  'attributes' &&
                mutation.attributeName ===
                  'data-theme'
              );

            }
          );


        if (!themeChanged) {
          return;
        }


        window.requestAnimationFrame(
          function () {


            window.requestAnimationFrame(
              alignAll
            );

          }
        );

      }
    );


  themeObserver.observe(
    document.documentElement,
    {
      attributes:
        true,

      attributeFilter:
        [
          'data-theme'
        ]
    }
  );


  /* =================================================
     RESPONSIVE RECALCULATION
  ================================================= */

  let alignmentTimer =
    null;


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
      passive:
        true
    }
  );


  /* =================================================
     CLEANUP
  ================================================= */

  window.addEventListener(
    'pagehide',

    function () {


      themeObserver.disconnect();


      if (
        alignmentTimer !==
        null
      ) {


        window.clearTimeout(
          alignmentTimer
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
   IDENTITY MARQUEE

   NEVER resizes the source files.

   It duplicates the existing logo group to create
   the seamless horizontal loop.
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
     SAVE SOURCE ITEMS
  ================================================= */

  const originalItems =
    Array.from(
      sourceGroup.children
    )
      .filter(
        function (
          item
        ) {


          return item.classList.contains(
            'identity-marquee__item'
          );

        }
      )
      .map(
        function (
          item
        ) {


          return item.cloneNode(
            true
          );

        }
      );


  if (!originalItems.length) {
    return;
  }


  /* =================================================
     DECORATIVE DUPLICATES
  ================================================= */

  function makeDecorative(
    node
  ) {


    node.setAttribute(
      'aria-hidden',
      'true'
    );


    node
      .querySelectorAll(
        'img'
      )
      .forEach(
        function (
          image
        ) {


          image.setAttribute(
            'alt',
            ''
          );

        }
      );


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
      function (
        item
      ) {


        group.appendChild(
          item.cloneNode(
            true
          )
        );

      }
    );


    return group;

  }


  /* =================================================
     ENSURE GROUP IS WIDER THAN VIEWPORT
  ================================================= */

  function fillGroup(
    group
  ) {


    const minimumWidth =
      window.innerWidth *
      1.2;


    let safety =
      0;


    while (
      group.scrollWidth <
        minimumWidth &&
      safety <
        10
    ) {


      originalItems.forEach(
        function (
          item
        ) {


          const copy =
            item.cloneNode(
              true
            );


          makeDecorative(
            copy
          );


          group.appendChild(
            copy
          );

        }
      );


      safety +=
        1;

    }

  }


  /* =================================================
     BUILD LOOP
  ================================================= */

  function buildMarquee() {


    const wasPaused =
      marquee.classList.contains(
        'is-paused'
      );


    track.innerHTML =
      '';


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
     PAUSE
  ================================================= */

  function setPaused(
    paused
  ) {


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
      String(
        paused
      )
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


  /* =================================================
     REDUCED MOTION
  ================================================= */

  const reducedMotion =
    window.matchMedia &&
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  buildMarquee();


  if (
    reducedMotion
  ) {


    setPaused(
      true
    );


    if (
      toggle
    ) {


      toggle.hidden =
        true;

    }


    return;
  }


  setPaused(
    false
  );


  /* =================================================
     BUTTON
  ================================================= */

  if (
    toggle
  ) {


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
     RESPONSIVE MARQUEE
  ================================================= */

  let resizeTimer =
    null;


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
        ) <
        32
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
      passive:
        true
    }
  );


}());


/* ===================================================
   BRANDING CARD STACK
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
          index +
          1
        );

    }
  );


  document
    .querySelectorAll(
      '[data-branding-project-count]'
    )
    .forEach(
      function (
        count
      ) {


        const total =
          cards.length;


        count.textContent =
          String(
            total
          ).padStart(
            2,
            '0'
          );


        count.setAttribute(
          'aria-label',

          total +
          (
            total ===
              1
              ? ' logo project'
              : ' logo projects'
          )
        );

      }
    );


}());
