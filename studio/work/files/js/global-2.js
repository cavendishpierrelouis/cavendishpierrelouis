'use strict';
















/* ===================================================
GLOBAL PROJECT PREVIEW EXTENSIONS








This file owns ONLY optional project-specific preview
switchers.








DARYNA:
- language modal
- English / Ukrainian / Polish selection
- three separately preloaded videos








CAVBOT:
- website / software toggle
- two real separately preloaded videos








IMPORTANT:








This file does NOT independently own:
- play
- pause
- visible-video playback state
- source replacement during switching








Those are owned only by global-work.js through:








window.CMPLCaseVideo
=================================================== */
















(function setupPreviewExtensions() {
















  let hasStarted =
    false;
















  /* ===================================================
  START ONLY AFTER THE CENTRAL VIDEO CONTROLLER EXISTS








  Normally global-work.js loads before this file.








  This additional ready event makes the relationship
  safe even if deferred script timing changes later.
  =================================================== */
















  function startPreviewExtensions(
    controller
  ) {
















    if (
      hasStarted ||
      !controller
    ) {
      return;
    }
















    hasStarted =
      true;
















    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection ||
      null;
















    const saveData =
      Boolean(
        connection &&
        connection.saveData
      );
















    /* ===================================================
    SHARED VIDEO VARIANT BUILDER








    DARYNA still uses this system.








    Each alternate language video is created ONCE,
    preloaded, and kept paused until requested.








    CavBot does NOT use this builder anymore because
    both CavBot videos now exist directly in the HTML.
    =================================================== */
















    function createVideoVariant(
      baseVideo,
      sourceUrl,
      variantName
    ) {
















      if (
        !baseVideo ||
        !sourceUrl
      ) {
        return null;
      }
















      const viewport =
        baseVideo.closest(
          '.case-browser__viewport'
        );
















      if (
        !viewport
      ) {
        return null;
      }
















      /*
        Prevent duplicate clones if a development server
        reinjects this script.
      */
      const existing =
        viewport.querySelector(
          `[data-case-generated-variant="${variantName}"]`
        );
















      if (
        existing
      ) {
















        controller.registerVideo(
          existing,
          {
            preload:
              existing.preload ||
              'metadata'
          }
        );
















        return existing;
















      }
















      /*
        Clone ONLY the <video> element itself.








        We deliberately do not clone nested <source>
        elements because every generated variant owns
        one direct src and that src is never replaced.
      */
      const video =
        baseVideo.cloneNode(
          false
        );
















      /*
        Remove any identity that belongs only to
        the original project video.
      */
      video.removeAttribute(
        'id'
      );
















      video.removeAttribute(
        'data-daryna-video'
      );
















      video.removeAttribute(
        'data-daryna-video-source'
      );
















      video.removeAttribute(
        'data-cavbot-video'
      );
















      video.removeAttribute(
        'data-cavbot-video-source'
      );
















      video.removeAttribute(
        'data-cavbot-video-website'
      );
















      video.removeAttribute(
        'data-cavbot-video-software'
      );
















      video.removeAttribute(
        'data-case-video-dark'
      );
















      video.removeAttribute(
        'data-case-video-light'
      );
















      /*
        Generated variants are still project videos,
        so they use the exact same global video styles.
      */
      video.setAttribute(
        'data-case-video',
        ''
      );
















      video.setAttribute(
        'data-case-generated-variant',
        variantName
      );
















      video.classList.remove(
        'is-active'
      );
















      /*
        The original video remains in normal flow and
        defines the exact screen height.








        Alternate videos sit directly over it.








        This preserves the perfect no-crop screen size
        already used by the case browser.
      */
      video.style.position =
        'absolute';
















      video.style.inset =
        '0';
















      video.style.width =
        '100%';
















      video.style.height =
        '100%';
















      video.style.objectFit =
        'contain';
















      video.style.objectPosition =
        'center center';
















      video.style.pointerEvents =
        'none';
















      /*
        Only the original video may have autoplay
        in the page HTML.








        Generated variants NEVER autoplay themselves.
      */
      video.autoplay =
        false;
















      video.removeAttribute(
        'autoplay'
      );
















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
















      video.loop =
        true;
















      /*
        Normal connection:
        preload alternate media for a smooth switch.








        Save Data:
        only request metadata.
      */
      video.preload =
        saveData
          ? 'metadata'
          : 'auto';
















      video.removeAttribute(
        'src'
      );
















      /*
        Set the generated media URL ONCE.








        We never destroy or replace this source during
        later language switching.
      */
      video.src =
        sourceUrl;
















      /*
        Keep controls layered above generated variants.








        Insert the generated video immediately after
        the original video instead of after any buttons.
      */
      baseVideo.insertAdjacentElement(
        'afterend',
        video
      );
















      controller.registerVideo(
        video,
        {
          preload:
            video.preload
        }
      );
















      /*
        Begin buffering without starting playback.
      */
      try {
















        video.load();
















      } catch (error) {
















        /*
          Browser will load naturally when needed.
        */
















      }
















      return video;
















    }
















    /* ===================================================
    DARYNA VOLIANIUK
    LANGUAGE VIDEO SWITCHER
    =================================================== */
















    (function setupDarynaLanguageSwitcher() {
















      const baseVideo =
        document.querySelector(
          '[data-daryna-video]'
        );
















      const toggle =
        document.querySelector(
          '[data-daryna-language-toggle]'
        );
















      const modal =
        document.querySelector(
          '[data-daryna-language-modal]'
        );
















      const closeButton =
        document.querySelector(
          '[data-daryna-language-close]'
        );
















      const options =
        Array.from(
          document.querySelectorAll(
            '[data-daryna-language]'
          )
        );
















      if (
        !baseVideo ||
        !toggle ||
        !modal ||
        !options.length
      ) {
        return;
      }
















      /*
        The language control is NEVER a Play/Pause
        control.








        This protects the page even if an accidental
        copied data attribute appears in the HTML later.
      */
      toggle.removeAttribute(
        'data-case-video-toggle'
      );
















      toggle.setAttribute(
        'type',
        'button'
      );
















      let currentLanguage =
        'en';
















      let currentLanguageName =
        'English';
















      let isOpen =
        false;
















      let closeTimer =
        null;
















      const videosByLanguage =
        new Map();
















      /*
        English uses the original video already present
        in the HTML.








        That video continues defining the viewport size.
      */
      videosByLanguage.set(
        'en',
        baseVideo
      );
















      controller.registerVideo(
        baseVideo,
        {
          preload:
            'auto'
        }
      );
















      /*
        Build Ukrainian and Polish ONCE.








        No source swapping later.
      */
      options.forEach(
        function (option) {
















          const language =
            option.dataset.darynaLanguage;
















          const source =
            option.dataset.darynaVideoSrc;
















          if (
            !language ||
            !source ||
            language ===
            'en'
          ) {
            return;
          }
















          const variant =
            createVideoVariant(
              baseVideo,
              source,
              `daryna-${language}`
            );
















          if (
            variant
          ) {
















            videosByLanguage.set(
              language,
              variant
            );
















          }
















        }
      );
















      /* ===================================================
      MODAL STATE
      =================================================== */
















      function clearCloseTimer() {
















        if (
          closeTimer !==
          null
        ) {
















          window.clearTimeout(
            closeTimer
          );
















          closeTimer =
            null;
















        }
















      }
















      function openModal() {
















        if (
          isOpen
        ) {
          return;
        }
















        clearCloseTimer();
















        isOpen =
          true;
















        modal.hidden =
          false;
















        toggle.classList.add(
          'is-open'
        );
















        toggle.setAttribute(
          'aria-expanded',
          'true'
        );
















        window.requestAnimationFrame(
          function () {
















            window.requestAnimationFrame(
              function () {
















                if (
                  !isOpen
                ) {
                  return;
                }
















                modal.classList.add(
                  'is-open'
                );
















              }
            );
















          }
        );
















        const activeOption =
          options.find(
            function (option) {
















              return (
                option.dataset.darynaLanguage ===
                currentLanguage
              );
















            }
          );
















        if (
          activeOption
        ) {
















          window.setTimeout(
            function () {
















              if (
                isOpen
              ) {
















                try {
















                  activeOption.focus(
                    {
                      preventScroll:
                        true
                    }
                  );
















                } catch (error) {
















                  activeOption.focus();
















                }
















              }
















            },








            40
          );
















        }
















      }
















      function closeModal(
        restoreFocus
      ) {
















        if (
          !isOpen
        ) {
          return;
        }
















        clearCloseTimer();
















        isOpen =
          false;
















        modal.classList.remove(
          'is-open'
        );
















        toggle.classList.remove(
          'is-open'
        );
















        toggle.setAttribute(
          'aria-expanded',
          'false'
        );
















        closeTimer =
          window.setTimeout(
            function () {
















              closeTimer =
                null;
















              if (
                !isOpen
              ) {
















                modal.hidden =
                  true;
















              }
















            },








            250
          );
















        if (
          restoreFocus
        ) {
















          try {
















            toggle.focus(
              {
                preventScroll:
                  true
              }
            );
















          } catch (error) {
















            toggle.focus();
















          }
















        }
















      }
















      function toggleModal() {
















        if (
          isOpen
        ) {
















          closeModal(
            true
          );
















        } else {
















          openModal();
















        }
















      }
















      /* ===================================================
      ACTIVE LANGUAGE
      =================================================== */
















      function updateActiveLanguage(
        language,
        languageName
      ) {
















        currentLanguage =
          language;
















        currentLanguageName =
          languageName;
















        options.forEach(
          function (option) {
















            const active =
              option.dataset.darynaLanguage ===
              currentLanguage;
















            option.classList.toggle(
              'is-active',
              active
            );
















            option.setAttribute(
              'aria-pressed',
              String(
                active
              )
            );
















          }
        );
















        toggle.setAttribute(
          'aria-label',
          `Change preview language. Current language: ${currentLanguageName}`
        );
















      }
















      /* ===================================================
      LANGUAGE SWITCH








      No:
      - source replacement
      - load()
      - seeking
      - competing play()
      =================================================== */
















      async function switchLanguage(
        option
      ) {
















        const nextLanguage =
          option.dataset.darynaLanguage;
















        const nextLanguageName =
          option.dataset.darynaLanguageName;
















        if (
          !nextLanguage ||
          !nextLanguageName
        ) {
          return;
        }
















        if (
          nextLanguage ===
          currentLanguage
        ) {
















          closeModal(
            true
          );
















          return;
















        }
















        const targetVideo =
          videosByLanguage.get(
            nextLanguage
          );
















        if (
          !targetVideo
        ) {
          return;
        }
















        /*
          Update the language UI immediately.








          Playback itself remains controlled only by
          global-work.js.
        */
        updateActiveLanguage(
          nextLanguage,
          nextLanguageName
        );
















        closeModal(
          true
        );
















        await controller.switchTo(
          targetVideo
        );
















      }
















      /* ===================================================
      EVENTS
      =================================================== */
















      toggle.addEventListener(
        'click',








        function (event) {
















          /*
            This control belongs only to the language
            selector.








            Never let this click participate in any
            browser-preview playback behavior.
          */
          event.preventDefault();








          event.stopPropagation();
















          toggleModal();
















        }
      );
















      if (
        closeButton
      ) {
















        closeButton.addEventListener(
          'click',








          function (event) {
















            event.preventDefault();








            event.stopPropagation();
















            closeModal(
              true
            );
















          }
        );
















      }
















      options.forEach(
        function (option) {
















          option.addEventListener(
            'click',








            function (event) {
















              event.preventDefault();








              event.stopPropagation();
















              switchLanguage(
                option
              );
















            }
          );
















        }
      );
















      function handleOutsidePointer(
        event
      ) {
















        if (
          !isOpen
        ) {
          return;
        }
















        if (
          modal.contains(
            event.target
          ) ||
          toggle.contains(
            event.target
          )
        ) {
          return;
        }
















        closeModal(
          false
        );
















      }
















      function handleEscape(
        event
      ) {
















        if (
          event.key !==
          'Escape' ||
          !isOpen
        ) {
          return;
        }
















        event.preventDefault();
















        closeModal(
          true
        );
















      }
















      document.addEventListener(
        'pointerdown',
        handleOutsidePointer
      );
















      document.addEventListener(
        'keydown',
        handleEscape
      );
















      /*
        Default:
        English.
      */
      updateActiveLanguage(
        'en',
        'English'
      );
















      modal.hidden =
        true;
















      window.addEventListener(
        'pagehide',








        function () {
















          clearCloseTimer();
















          document.removeEventListener(
            'pointerdown',
            handleOutsidePointer
          );
















          document.removeEventListener(
            'keydown',
            handleEscape
          );
















        },








        {
          once:
            true
        }
      );
















    }());
















    /* ===================================================
    CAVBOT
    WEBSITE / SOFTWARE VIDEO SWITCHER








    CavBot uses TWO real video elements already
    present in cavbot.html.








    WEBSITE FIRST:
    software icon shows








    SOFTWARE ACTIVE:
    website icon shows








    IMPORTANT:








    This switcher NEVER:
    - pauses video
    - plays video
    - changes src
    - calls load()
    - changes currentTime








    It only asks CMPLCaseVideo which already-loaded
    video should become active.








    global-work.js remains the ONLY playback owner.
    =================================================== */
















    (function setupCavBotViewSwitcher() {
















      const websiteVideo =
        document.querySelector(
          '[data-cavbot-video-website]'
        );
















      const softwareVideo =
        document.querySelector(
          '[data-cavbot-video-software]'
        );
















      const toggle =
        document.querySelector(
          '[data-cavbot-view-toggle]'
        );
















      if (
        !websiteVideo ||
        !softwareVideo ||
        !toggle
      ) {
        return;
      }
















      /*
        Absolutely guarantee the website/software
        switcher can never identify itself as the
        Play/Pause button.
      */
      toggle.removeAttribute(
        'data-case-video-toggle'
      );
















      toggle.setAttribute(
        'type',
        'button'
      );
















      /*
        Both videos already exist in the HTML.








        Register them with the ONE central controller.
      */
      controller.registerVideo(
        websiteVideo,
        {
          preload:
            'auto'
        }
      );
















      controller.registerVideo(
        softwareVideo,
        {
          preload:
            'auto'
        }
      );
















      let switchInFlight =
        false;
















      let requestToken =
        0;
















      /* ===================================================
      CONTROL STATE








      Website active:
      show software icon.








      Software active:
      show website icon.
      =================================================== */
















      function updateControl() {
















        const activeVideo =
          controller.getActiveVideo();
















        const softwareIsActive =
          activeVideo ===
          softwareVideo;
















        toggle.classList.toggle(
          'is-software-view',
          softwareIsActive
        );
















        toggle.setAttribute(
          'aria-pressed',
          String(
            softwareIsActive
          )
        );
















        if (
          softwareIsActive
        ) {
















          toggle.setAttribute(
            'aria-label',
            'Show CavBot website preview'
          );
















          toggle.setAttribute(
            'title',
            'Show website'
          );
















        } else {
















          toggle.setAttribute(
            'aria-label',
            'Show CavBot software preview'
          );
















          toggle.setAttribute(
            'title',
            'Show software'
          );
















        }
















      }
















      /* ===================================================
      SWITCH








      No playback methods exist here.








      CMPLCaseVideo decides whether the new video
      should play or remain paused based on the
      current visitor Play/Pause state.
      =================================================== */
















      async function switchPreview(
        targetVideo
      ) {
















        if (
          !targetVideo ||
          switchInFlight
        ) {
          return;
        }
















        switchInFlight =
          true;
















        const token =
          ++requestToken;
















        try {
















          const switched =
            await controller.switchTo(
              targetVideo
            );
















          /*
            Ignore stale async completion.
          */
          if (
            token !==
            requestToken
          ) {
            return;
          }
















          /*
            Whether successful or not, read the
            controller's REAL active video rather
            than guessing which one is visible.
          */
          if (
            switched
          ) {
















            updateControl();
















          } else {
















            updateControl();
















          }
















        } finally {
















          if (
            token ===
            requestToken
          ) {
















            switchInFlight =
              false;
















          }
















        }
















      }
















      /* ===================================================
      CLICK








      This click belongs ONLY to Website / Software.








      It never reaches playback behavior.
      =================================================== */
















      toggle.addEventListener(
        'click',








        function (event) {
















          event.preventDefault();








          event.stopPropagation();








          event.stopImmediatePropagation();
















          if (
            switchInFlight
          ) {
            return;
          }
















          const activeVideo =
            controller.getActiveVideo();
















          const targetVideo =
            activeVideo ===
            softwareVideo
              ? websiteVideo
              : softwareVideo;
















          switchPreview(
            targetVideo
          );
















        }
      );
















      /* ===================================================
      CENTRAL CONTROLLER SYNC








      If global-work.js changes the active CavBot video,
      this updates ONLY the website/software icon.








      It never touches playback.
      =================================================== */
















      function handleCaseVideoChange(
        event
      ) {
















        const changedVideo =
          event &&
          event.detail
            ? event.detail.video
            : null;
















        if (
          changedVideo !==
          websiteVideo &&
          changedVideo !==
          softwareVideo
        ) {
          return;
        }
















        updateControl();
















      }
















      document.addEventListener(
        'cmpl:case-video-change',
        handleCaseVideoChange
      );
















      /* ===================================================
      INITIAL STATE








      Website carries .is-active in HTML.








      global-work.js therefore selects Website as the
      first CavBot preview.








      Software remains loaded but invisible and paused
      until requested.
      =================================================== */
















      updateControl();
















      window.requestAnimationFrame(
        function () {
















          updateControl();
















        }
      );
















      /* ===================================================
      CLEANUP
      =================================================== */
















      window.addEventListener(
        'pagehide',








        function () {
















          requestToken +=
            1;
















          switchInFlight =
            false;
















          document.removeEventListener(
            'cmpl:case-video-change',
            handleCaseVideoChange
          );
















        },








        {
          once:
            true
        }
      );

    }());


  }


  /* ===================================================
  CONTROLLER BOOT


  Normal case:
  global-work.js already exists.


  Fallback:
  wait for its explicit ready event.
  =================================================== */


  if (
    window.CMPLCaseVideo
  ) {


    startPreviewExtensions(
      window.CMPLCaseVideo
    );



  } else {


    document.addEventListener(
      'cmpl:case-video-controller-ready',


      function (event) {

        const controller =
          event &&
          event.detail
            ? event.detail.controller
            : window.CMPLCaseVideo;


        startPreviewExtensions(
          controller
        );


      },


      {
        once:
          true
      }
    );



  }



}());
