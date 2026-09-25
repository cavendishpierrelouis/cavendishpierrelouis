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
 - Documentation desktop PDF viewer
 - Documentation mobile PDF.js viewer
 - click / tap PDF to open the original file
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
 SHARED PDF.JS LOADER

 Desktop continues using the native iframe.

 Small screens use PDF.js because embedded native
 PDF viewing is unreliable in mobile Safari.

 Nothing is converted to a screenshot.
 The actual PDF file is rendered page by page.
=================================================== */


(function setupPdfJsLoader() {
 if (window.__cmplLoadPdfJs) {
   return;
 }


 const PDF_JS_URL =
   'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';


 const PDF_WORKER_URL =
   'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';


 let loaderPromise = null;


 window.__cmplLoadPdfJs =
   function loadPdfJs() {
     if (
       window.pdfjsLib &&
       window.pdfjsLib.getDocument
     ) {
       window.pdfjsLib
         .GlobalWorkerOptions
         .workerSrc =
           PDF_WORKER_URL;


       return Promise.resolve(
         window.pdfjsLib
       );
     }


     if (loaderPromise) {
       return loaderPromise;
     }


     loaderPromise =
       new Promise(
         function (resolve, reject) {
           const existing =
             document.querySelector(
               'script[data-cmpl-pdf-js]'
             );


           if (existing) {
             existing.addEventListener(
               'load',
               function () {
                 if (
                   window.pdfjsLib &&
                   window.pdfjsLib.getDocument
                 ) {
                   window.pdfjsLib
                     .GlobalWorkerOptions
                     .workerSrc =
                       PDF_WORKER_URL;


                   resolve(
                     window.pdfjsLib
                   );
                 } else {
                   reject(
                     new Error(
                       'PDF.js loaded without pdfjsLib.'
                     )
                   );
                 }
               },
               {
                 once: true
               }
             );


             existing.addEventListener(
               'error',
               function () {
                 reject(
                   new Error(
                     'Unable to load PDF.js.'
                   )
                 );
               },
               {
                 once: true
               }
             );


             return;
           }


           const script =
             document.createElement(
               'script'
             );


           script.src =
             PDF_JS_URL;


           script.async =
             true;


           script.dataset.cmplPdfJs =
             'true';


           script.addEventListener(
             'load',
             function () {
               if (
                 !window.pdfjsLib ||
                 !window.pdfjsLib.getDocument
               ) {
                 reject(
                   new Error(
                     'PDF.js loaded without pdfjsLib.'
                   )
                 );


                 return;
               }


               window.pdfjsLib
                 .GlobalWorkerOptions
                 .workerSrc =
                   PDF_WORKER_URL;


               resolve(
                 window.pdfjsLib
               );
             },
             {
               once: true
             }
           );


           script.addEventListener(
             'error',
             function () {
               reject(
                 new Error(
                   'Unable to load PDF.js.'
                 )
               );
             },
             {
               once: true
             }
           );


           document.head.appendChild(
             script
           );
         }
       );


     return loaderPromise;
   };
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


     const documentationPdfUrl =
       documentationPdfSource
         ? new URL(
             documentationPdfSource,
             window.location.href
           ).href
         : '';


     const documentationPdfScreen =
       documentationPdf
         ? documentationPdf.closest(
             '.capabilities-documentation__screen--pdf'
           )
         : null;


     let documentationMobileViewer =
       null;


     let documentationMobilePages =
       null;


     let documentationMobileRendered =
       false;


     let documentationMobileRendering =
       false;


     let documentationMobileRenderPromise =
       null;


     let documentationResizeTimer =
       null;


     let documentationDesktopHitbox =
       null;


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
       OPEN ORIGINAL PDF
     =================================================== */


     function openDocumentationPdf() {
       if (!documentationPdfUrl) {
         return;
       }


       const openedWindow =
         window.open(
           documentationPdfUrl,
           '_blank',
           'noopener,noreferrer'
         );


       if (openedWindow) {
         openedWindow.opener =
           null;
       }
     }


     /* ===================================================
       DESKTOP FULL-PDF CLICK LAYER

       No visible button is created.

       The transparent anchor occupies the actual
       PDF preview itself.
     =================================================== */


     function setupDocumentationDesktopHitbox() {
       if (
         !documentationPdfScreen ||
         !documentationPdfUrl
       ) {
         return;
       }


       documentationDesktopHitbox =
         documentationPdfScreen
           .querySelector(
             '.capabilities-documentation__open-hitbox'
           );


       if (documentationDesktopHitbox) {
         return;
       }


       documentationDesktopHitbox =
         document.createElement(
           'a'
         );


       documentationDesktopHitbox
         .className =
           'capabilities-documentation__open-hitbox';


       documentationDesktopHitbox
         .href =
           documentationPdfUrl;


       documentationDesktopHitbox
         .target =
           '_blank';


       documentationDesktopHitbox
         .rel =
           'noopener noreferrer';


       documentationDesktopHitbox
         .setAttribute(
           'aria-label',
           'Open CavBot pitch deck PDF'
         );


       documentationDesktopHitbox
         .setAttribute(
           'title',
           'Open PDF'
         );


       documentationPdfScreen
         .appendChild(
           documentationDesktopHitbox
         );
     }


     /* ===================================================
       MOBILE PDF VIEWER
     =================================================== */


     function isMobileDocumentationViewer() {
       return window.matchMedia(
         '(max-width: 860px)'
       ).matches;
     }


     function setupDocumentationMobileViewer() {
       if (
         !documentationPdfScreen ||
         !documentationPdfUrl
       ) {
         return;
       }


       if (documentationMobileViewer) {
         return;
       }


       documentationMobileViewer =
         document.createElement(
           'div'
         );


       documentationMobileViewer.className =
         'capabilities-documentation__pdf-mobile';


       documentationMobileViewer.setAttribute(
         'role',
         'region'
       );


       documentationMobileViewer.setAttribute(
         'aria-label',
         'Scrollable pitch deck PDF'
       );


       documentationMobileViewer.setAttribute(
         'tabindex',
         '0'
       );


       documentationMobilePages =
         document.createElement(
           'div'
         );


       documentationMobilePages.className =
         'capabilities-documentation__pdf-pages';


       documentationMobileViewer.appendChild(
         documentationMobilePages
       );


       documentationPdfScreen.appendChild(
         documentationMobileViewer
       );


       /*
        A normal swipe remains a normal scroll.

        A tap on an actual rendered PDF page opens
        the complete PDF in a new browser tab.

        Mobile browsers suppress the click event after
        a real scrolling gesture, so this does not
        interfere with normal vertical scrolling.
       */
       documentationMobileViewer.addEventListener(
         'click',
         function (event) {
           const page =
             event.target.closest(
               '.capabilities-documentation__pdf-page'
             );


           if (!page) {
             return;
           }


           event.preventDefault();


           openDocumentationPdf();
         }
       );
     }


     function showDocumentationLoading() {
       if (!documentationMobilePages) {
         return;
       }


       documentationMobilePages.replaceChildren();


       const loading =
         document.createElement(
           'div'
         );


       loading.className =
         'capabilities-documentation__pdf-loading';


       loading.textContent =
         'Loading PDF…';


       documentationMobilePages.appendChild(
         loading
       );
     }


     function showDocumentationError() {
       if (!documentationMobilePages) {
         return;
       }


       documentationMobilePages.replaceChildren();


       const error =
         document.createElement(
           'div'
         );


       error.className =
         'capabilities-documentation__pdf-error';


       const wrapper =
         document.createElement(
           'div'
         );


       const text =
         document.createElement(
           'p'
         );


       text.textContent =
         'The PDF could not be shown here.';


       const link =
         document.createElement(
           'a'
         );


       link.href =
         documentationPdfUrl;


       link.target =
         '_blank';


       link.rel =
         'noopener noreferrer';


       link.textContent =
         'Open the PDF';


       wrapper.appendChild(
         text
       );


       wrapper.appendChild(
         link
       );


       error.appendChild(
         wrapper
       );


       documentationMobilePages.appendChild(
         error
       );
     }


     async function renderDocumentationMobilePdf() {
       if (
         !documentationPdfUrl ||
         !isMobileDocumentationViewer()
       ) {
         return;
       }


       setupDocumentationMobileViewer();


       if (
         !documentationMobileViewer ||
         !documentationMobilePages
       ) {
         return;
       }


       if (
         documentationMobileRendering
       ) {
         return documentationMobileRenderPromise;
       }


       if (
         documentationMobileRendered
       ) {
         return;
       }


       documentationMobileRendering =
         true;


       showDocumentationLoading();


       documentationMobileRenderPromise =
         (async function () {
           try {
             const pdfjsLib =
               await window.__cmplLoadPdfJs();


             const loadingTask =
               pdfjsLib.getDocument(
                 documentationPdfUrl
               );


             const pdf =
               await loadingTask.promise;


             documentationMobilePages
               .replaceChildren();


             const availableWidth =
               Math.max(
                 280,
                 documentationMobileViewer
                   .clientWidth -
                 20
               );


             const outputScale =
               Math.min(
                 window.devicePixelRatio || 1,
                 2
               );


             for (
               let pageNumber = 1;
               pageNumber <= pdf.numPages;
               pageNumber += 1
             ) {
               const page =
                 await pdf.getPage(
                   pageNumber
                 );


               const naturalViewport =
                 page.getViewport(
                   {
                     scale: 1
                   }
                 );


               const scale =
                 availableWidth /
                 naturalViewport.width;


               const viewport =
                 page.getViewport(
                   {
                     scale: scale
                   }
                 );


               const canvas =
                 document.createElement(
                   'canvas'
                 );


               canvas.className =
                 'capabilities-documentation__pdf-page';


               canvas.setAttribute(
                 'aria-label',
                 `PDF page ${pageNumber}`
               );


               canvas.setAttribute(
                 'role',
                 'button'
               );


               canvas.setAttribute(
                 'tabindex',
                 '0'
               );


               canvas.setAttribute(
                 'title',
                 'Open PDF'
               );


               const context =
                 canvas.getContext(
                   '2d',
                   {
                     alpha: false
                   }
                 );


               canvas.width =
                 Math.max(
                   1,
                   Math.floor(
                     viewport.width *
                     outputScale
                   )
                 );


               canvas.height =
                 Math.max(
                   1,
                   Math.floor(
                     viewport.height *
                     outputScale
                   )
                 );


               canvas.style.width =
                 `${Math.floor(viewport.width)}px`;


               canvas.style.height =
                 `${Math.floor(viewport.height)}px`;


               canvas.addEventListener(
                 'keydown',
                 function (event) {
                   if (
                     event.key !== 'Enter' &&
                     event.key !== ' '
                   ) {
                     return;
                   }


                   event.preventDefault();


                   openDocumentationPdf();
                 }
               );


               documentationMobilePages
                 .appendChild(
                   canvas
                 );


               await page.render(
                 {
                   canvasContext:
                     context,


                   viewport:
                     viewport,


                   transform:
                     outputScale !== 1
                       ? [
                           outputScale,
                           0,
                           0,
                           outputScale,
                           0,
                           0
                         ]
                       : null,


                   background:
                     '#FFFFFF'
                 }
               ).promise;


               page.cleanup();
             }


             documentationMobileRendered =
               true;


           } catch (error) {
             console.error(
               'Unable to render documentation PDF:',
               error
             );


             documentationMobileRendered =
               false;


             showDocumentationError();


           } finally {
             documentationMobileRendering =
               false;
           }
         }());


       return documentationMobileRenderPromise;
     }


     function resetDocumentationMobilePdf() {
       if (
         !documentationMobileViewer ||
         !documentationMobilePages
       ) {
         return;
       }


       documentationMobileRendered =
         false;


       documentationMobileRendering =
         false;


       documentationMobileRenderPromise =
         null;


       documentationMobilePages
         .replaceChildren();
     }


     function handleDocumentationResize() {
       if (
         documentationResizeTimer !==
         null
       ) {
         window.clearTimeout(
           documentationResizeTimer
         );
       }


       documentationResizeTimer =
         window.setTimeout(
           function () {
             documentationResizeTimer =
               null;


             if (
               !isMobileDocumentationViewer()
             ) {
               return;
             }


             if (
               activeIndex !==
               documentationIndex
             ) {
               return;
             }


             resetDocumentationMobilePdf();


             renderDocumentationMobilePdf();
           },
           240
         );
     }


     setupDocumentationDesktopHitbox();
     setupDocumentationMobileViewer();


     window.addEventListener(
       'resize',
       handleDocumentationResize,
       {
         passive: true
       }
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


       if (
         isMobileDocumentationViewer()
       ) {
         renderDocumentationMobilePdf();
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
             if (
               isPaused &&
               index !==
               documentationIndex
             ) {
               releaseDocumentationPause();
             }


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


         window.removeEventListener(
           'resize',
           handleDocumentationResize
         );


         if (
           documentationResizeTimer !==
           null
         ) {
           window.clearTimeout(
             documentationResizeTimer
           );


           documentationResizeTimer =
             null;
         }
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