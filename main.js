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
const section    = document.getElementById('portfolio');
const numberEl   = document.querySelector('.projects-count-number');
const barEl      = document.querySelector('.project-progress-bar');
const barValueEl = document.querySelector('.project-progress-value');




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
      if (entry.isIntersecting) {
        animate();
      }
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
const animatedEls = document.querySelectorAll(
  '.section, .js-type-on-scroll'
);




if (!animatedEls.length) return;




if (!('IntersectionObserver' in window)) {
  animatedEls.forEach((el) => el.classList.add('is-in'));
  return;
}




const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
      } else {
        entry.target.classList.remove('is-in');
      }
    });
  },
  {
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
 + HERO SCROLL ARROW (re-triggers on scroll)
 ========================================== */
(function setupHeroNameAnimation() {
 const body = document.body;
 if (!body.classList.contains('home-page')) return;


 const header  = document.querySelector('header.pagehead');
 const nameEl  = document.querySelector('.hero-name');
 const arrowEl = document.querySelector('.hero-scroll-arrow');
 if (!header || !nameEl) return;


 const rawName = (nameEl.dataset.name || nameEl.textContent || '').trim();
 if (!rawName) return;


 // Build letter spans once
 const chars = Array.from(rawName);
 nameEl.textContent = ''; // clear fallback text


 const LETTER_DELAY  = 100;  // ms between letters
 const BASE_DURATION = 900; // ms drop duration per letter
 const totalDuration =
   BASE_DURATION + LETTER_DELAY * Math.max(chars.length - 1, 0);


 chars.forEach((ch, index) => {
   const span = document.createElement('span');
   span.className = 'hero-name-char';
   span.textContent = ch === ' ' ? '\u00A0' : ch;
   span.style.animationDelay = (LETTER_DELAY * index) / 800 + 's';
   nameEl.appendChild(span);
 });


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
document.body.classList.add('hero-arrow-ready');


// If the hero is currently in view (initial load), show the arrow immediately
const arrow = document.querySelector('.hero-scroll-arrow');
if (arrow) {
 const rect = header.getBoundingClientRect();
 const inView = rect.top < window.innerHeight && rect.bottom > 0;
 if (inView) {
   arrow.classList.add('is-visible');
 }
}
       }
     }, PHASE_TIME);


     waveTimeouts.push(timeoutId);
   }


   nextPhase();
 }


 function playHeroName() {
   // Reset any previous wave + final state
   clearWaveTimeouts();
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


 function showArrow() {
   if (!arrowEl) return;


   // Remove class first to reset any prior animation
   arrowEl.classList.remove('is-visible');
   void arrowEl.offsetWidth; // force reflow to restart float-in
   arrowEl.classList.add('is-visible');
 }


 function hideArrow() {
   if (!arrowEl) return;
   arrowEl.classList.remove('is-visible');
 }


 function onHeroEnter() {
   playHeroName(); // re-trigger name glow every time hero re-enters
   showArrow();    // float-in + bounce arrow each time
 }


 function onHeroLeave() {
   hideArrow();    // fade out arrow when hero is gone
 }


 if ('IntersectionObserver' in window) {
   const observer = new IntersectionObserver(
     (entries) => {
       entries.forEach((entry) => {
         if (entry.target !== header) return;


         if (entry.isIntersecting) {
           onHeroEnter();
         } else {
           onHeroLeave();
         }
       });
     },
     { threshold: 0.6 }
   );


   observer.observe(header);
 } else {
   // Fallback: run once on load and keep arrow visible
   onHeroEnter();
 }
 
 // If IntersectionObserver isn't supported, just show it once name is ready
 if (!('IntersectionObserver' in window)) {
   if (document.body.classList.contains('hero-arrow-ready')) {
     arrow.classList.add('is-visible');
   }
   return;
 }


 const observer = new IntersectionObserver(
   (entries) => {
     entries.forEach((entry) => {
       const inView = entry.isIntersecting;


       if (
         inView &&
         document.body.classList.contains('hero-arrow-ready')
       ) {
         arrow.classList.add('is-visible');     // fade in / float up
       } else {
         arrow.classList.remove('is-visible');  // fade out on scroll away
       }
     });
   },
   { threshold: 0.5 }
 );


 observer.observe(header);
})();


/* ==========================================
 SCROLL-SCALE TYPOGRAPHY
 ========================================== */
(function setupScrollScale() {
const items = document.querySelectorAll('.scale-item');
if (!items.length) return;




function update() {
  const viewportCenter = window.innerHeight * 0.5;




  items.forEach((item) => {
    const rect       = item.getBoundingClientRect();
    const itemCenter = rect.top + rect.height / 2;




    const dist = Math.abs(itemCenter - viewportCenter);




    // scale window where item becomes fully active
    const activationDistance = window.innerHeight * 0.28;




    if (dist < activationDistance) {
      item.classList.add('is-active');
      // gentle overshoot when perfectly centered
      if (dist < 40) {
        item.classList.add('is-overshoot');
      } else {
        item.classList.remove('is-overshoot');
      }
    } else {
      item.classList.remove('is-active', 'is-overshoot');
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




let index  = 0;
let hasRun = false;




function typeNextChar() {
  if (index > source.length) return;
  codeEl.textContent = source.slice(0, index);




  index++;




  // Smooth, not too fast — feel like careful coding
  const baseSpeed = 32;  // ms per char
  const variance  = 26;  // random wobble so it's not robotic
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
        if (entry.isIntersecting) {
          startTyping();
        }
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
 WHY BOX TYPEWRITER — hello world loop
 ========================================== */
// NEW
(function setupWhyBoxTypewriter() {
 const el = document.getElementById('typewriter-message');
 if (!el) return; // blog-only; safely no-op elsewhere


 const phrases = [
   'hello world',
   'happy coding everyone'
 ];


 let phraseIndex = 0;


 function typePhrase() {
   const text = phrases[phraseIndex];
   let charIndex = 0;


   el.textContent = '';


   function step() {
     if (charIndex <= text.length) {
       el.textContent = text.slice(0, charIndex);
       charIndex += 1;
       // typing speed: tweak to taste
       setTimeout(step, 80);
     } else {
       // Pause before switching to the next phrase
       setTimeout(() => {
         phraseIndex = (phraseIndex + 1) % phrases.length;
         typePhrase();
       }, 3000); // 3s pause after full phrase
     }
   }


   step();
 }


 typePhrase();
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




  // Keep the reveal state on when active
  title.classList.add('is-active');




  cycleIndex += 1;
}




function handleScroll() {
  if (!isActive) return;




  const currentY = window.scrollY;
  const delta    = Math.abs(currentY - lastScrollY);




  // How sensitive it is to scroll movement:
  // smaller number = more frequent color changes
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
        // Just came into view → start listening + set first palette
        isActive = true;
        lastScrollY = window.scrollY;
        applyPalette();
        window.addEventListener('scroll', handleScroll, { passive: true });
      } else if (!entry.isIntersecting && isActive) {
        // Left the viewport → stop listening to keep things light
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
/* End of main.js */
