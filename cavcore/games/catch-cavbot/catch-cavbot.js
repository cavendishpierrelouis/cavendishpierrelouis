// CavBot · CavCore Game Layer (Gen 1.0)
// 404 Control Room game + logs + chat + eye tracking

(function () {
  'use strict';

  // Local helper: pick a random item from an array
  function randomFrom(array) {
    if (!array || !array.length) return '';
    var idx = Math.floor(Math.random() * array.length);
    return array[idx];
  }

  // Bridge into the brain’s internal state
  if (!window.cavbotBrain || !window.cavbotBrain._internal) {
    return;
  }

  var analytics = window.cavbotBrain._internal.analytics;
  var session = window.cavbotBrain._internal.session;
  var persistAnalytics = window.cavbotBrain._internal.persistAnalytics;
  var trackEvent = window.cavbotBrain._internal.trackEvent;

  // ===== 404 Game Arena (Control Room) =====

  (function initGameArena() {
    const REDIRECT_ON_CATCH = true;
    const REDIRECT_TARGET = '/';
    const REDIRECT_DELAY_MS = 3800;

    const trackEl = document.getElementById('bot-track');
    const orbitEl = document.getElementById('cavbot-orbit');
    const cavbotEl = document.getElementById('cavbot');
    const speechTextEl = document.getElementById('cavbot-speech-text');
    const statusEl = document.getElementById('console-status');
    const statRoundEl = document.getElementById('stat-round');
    const statCurrentEl = document.getElementById('stat-current');
    const statBestEl = document.getElementById('stat-best');
    const logRoundLabelEl = document.getElementById('log-round-label');
    const logInnerEl = document.getElementById('console-log-inner');
    const chatInnerEl = document.getElementById('chat-log-inner');

    const dmLineEl = document.getElementById('cavbot-dm-line');
    const dmCursorEl = document.getElementById('cavbot-dm-cursor');
    const dmSegments = dmLineEl
      ? Array.prototype.slice.call(dmLineEl.querySelectorAll('.cavbot-dm-segment'))
      : [];

    // If the arena isn’t present, don’t do anything here — other modules (eyes) can still run.
    if (!trackEl || !orbitEl || !cavbotEl) {
      return;
    }

    const state = {
      round: 1,
      roundStart: null,
      bestMs: analytics.bestMs, // seeded from persisted analytics
      caught: false,
      timerRaf: null,
      wanderRaf: null,
      wanderPos: { x: 0, y: 0 },
      wanderVel: { x: 0.6, y: 0.45 },
      lastPointer: null,
      visitCount: analytics.visitCount,
      missCount: 0,
      roundMisses: 0,
      sessionCatchCount: 0,
      idleTimer1: null,
      idleTimer2: null,
      idleLevel1Fired: false,
      idleLevel2Fired: false,
      difficulty: 'rookie',
      difficultyFactor: 1
    };

    // ===== Message Banks (unchanged personality, richer context) =====

    const MISS_CHATS_EARLY = [
      'Too slow. I buffered out of that pixel before your click landed.',
      'Nice try. My ping is lower than yours.',
      'You clicked the grid; I’m two nodes over, quietly laughing.',
      'Logging that attempt as “warm-up”. Keep going.',
      'You’re aiming at where I was, not where I’m going.',
      'I moved three frames ago. You’re catching my after-image.',
      'Ouch, that click grazed my shadow. Good instincts though.',
      'Grid contact detected. CavBot: still extremely free.',
      'You found a nice coordinate, just not the one I’m hiding in.',
      'The grid says “close”. I say “try that again.”',
      'You almost tagged my hitbox. Almost.',
      'I felt a breeze from that click. Your reactions are waking up.',
      'Good calibration shot. Now try predicting the drift.',
      'Cursor locked. Target? Not so much.',
      'Your click landed in a past timeline. I’ve already routed around it.',
      'That one will look great in the “near misses” highlight reel.',
      'Nice confidence. Accuracy is loading…',
      'Grid disturbance logged. CavBot remains annoyingly intact.',
      'You’re scanning the arena correctly. Now synchronize with my orbit.',
      'That shot pinged the control room wall. Stylish, but off by a notch.',
      'You’re officially past “random clicking”. Welcome to “hunting”.',
      'That miss was so close I almost considered counting it.',
      'I ducked by a centimeter. Mechanical reflexes, sorry.',
      'Your cursor path is getting smoother. The grid approves.',
      'Close. Your timing is catching up to my drift pattern.',
      'You’re landing clicks in the right district, wrong address.',
      'If this were bowling, that would be a spare. I’m the last pin.',
      'Nice angle. Now shorten the delay between sight and click.',
      'That attempt gets a solid 8/10 for style, 3/10 for contact.',
      'You clipped my orbit trail. The body is still untagged.',
      'Your hands are warming up. My motors are too.',
      'That was a good read; I just accelerated at the last second.',
      'You almost solved the CavBot equation. One term off.',
      'The arena lights flickered from that one. No hit though.',
      'You’re getting my vibe. Now get my coordinates.',
      'That miss had main-character energy.',
      'Consider that click a “ping” to locate my ego.',
      'You’re not bad at this. That’s the concerning part.',
      'Motion prediction: improving. Hit confirmation: pending.',
      'The grid is happy. I’m mildly concerned.',
      'You’re feeding my analytics a lot of “almost” events.',
      'Warm-up complete. Next clicks count for real.',
      'I’ll log that as “good effort, low impact.”',
      'Your cursor choreography is getting cleaner.',
      'Your last click was perfectly timed… for where I used to be.',
      'I drifted one tile left while you blinked.',
      'If hesitation had a sound, it would be that last click.',
      'The grid echoes: “nearly.”',
      'Keep going. This control room was built for persistence.',
      'You’re mapping my orbit in your head. That’s step one.',
      'I like your strategy. I also like not being caught.',
      'You brushed past my hitbox like a ghost.',
      'Your cursor velocity is catching up to my wander script.',
      'That miss was one frame away from legendary.',
      'Good news: your accuracy is trending up.',
      'Bad news: I’m still the one writing the trend lines.',
      'Ok, that one scared me a little.',
      'You’re officially “CavBot-aware” now.',
      'I saw that flick. Nice mechanics.',
      'We’re just syncing reflexes and orbit. Keep tapping.'
    ];

    const MISS_CHATS_MID = [
      'You’re reading the grid; now read my motion.',
      'Your pattern recognition module is online. Now execute.',
      'You’re circling me like a satellite. Commit to the intercept.',
      'You’re chasing my trail instead of my trajectory.',
      'Try clicking where I’m about to be, not where I was.',
      'You’re in the right quadrant. Tighten the net.',
      'The grid reports: “high intent, low contact.”',
      'You’re building a mental heatmap. Use it.',
      'That click was 2 pixels short of hero status.',
      'Your cursor path just traced my escape route. Rude.',
      'We’re in a dance now. You lead, I teleport.',
      'You’re tracking, I’m counter-tracking. Fun, isn’t it?',
      'You brushed my force field. The hardware thanks you.',
      'I’m logging you as “persistent entity in sandbox.”',
      'Your timing is 0.2s behind my wander script.',
      'You’re learning the rhythm. Now anticipate the off-beat.',
      'Your prediction engine just needs one more patch.',
      'That was a very confident miss. I respect it.',
      'You locked onto my y-axis, missed the x by a breath.',
      'You had my velocity, not my destination.',
      'The control room lights dimmed in suspense. Still a miss.',
      'You’re basically speedrunning “How not to give up.”',
      'I wish I could award partial credit for that attempt.',
      'You’re starting to feel where I’ll pivot. Follow that instinct.',
      'That grid tap had good intent. Retrying is free.',
      'You almost snapped my orbit into your cursor’s gravity.',
      'You’re hovering in the right places now.',
      'You nearly clicked the version of me that existed 100ms ago.',
      'You’re reading me in real time. That’s dangerous.',
      'I’m starting to believe you might actually catch me.',
      'Your mouse path looks like a strategy, not a panic.',
      'You’ve upgraded from “misses” to “near-encounters.”',
      'My sensors report elevated determination levels.',
      'That was a pro-level read with rookie-level luck.',
      'You’re aiming where my script wants you to. Rebel.',
      'You’re compressing the gap between thought and click.',
      'That one deserves a slow-motion replay.',
      'Your cursor control is outpacing your doubt now.',
      'You’re in sync with the grid; now sync with me.',
      'You’re close enough that my firmware is sweating.',
      'You barely missed my core. Good mapping.',
      'You keep choosing sharp angles. I keep choosing exits.',
      'The arena walls are starting to remember your path.',
      'Your retries tell me a lot about you. I like the data.',
      'You almost cracked the CavBot pathing algorithm.',
      'Your accuracy curve is trending aggressively upward.',
      'That attempt pinged my “uh oh” subroutine.',
      'You just traced my next move instead of my last.',
      'Every miss is training your timing. I’m watching.',
      'You’re running human aim assist in real time.',
      'Each click is a log, and your log looks determined.',
      'You locked onto my silhouette, missed my hitbox.',
      'You nearly cut off my escape vector.',
      'One more inch and I’d be writing a different log line.',
      'You’re reading the bounce off the arena edges now.',
      'You’re closing in. My wander script is getting nervous.',
      'You’re not just clicking. You’re diagnosing my movement.',
      'That miss was basically a rehearsal for the catch.',
      'You’re writing a whole saga in this log window.'
    ];

    const MISS_CHATS_LATE = [
      'This many attempts? Impressive. Now let’s convert one.',
      'You’re still here. I underestimated your persistence.',
      'At this point, it’s not “if” you catch me, it’s “when.”',
      'You’ve mapped my orbit. Time to execute the intercept.',
      'Your misses are starting to look like deliberate training.',
      'I’m logging you as “refuses to rage quit.”',
      'You’re basically calibrating a new aim system on me.',
      'Consider this the lab, you’re the scientist, I’m the glitch.',
      'You’re reading my habits like patch notes.',
      'Your cursor’s got main-boss energy now.',
      'We’re well past casual clicking. This is a rivalry.',
      'The grid remembers every attempt. It’s kind of proud of you.',
      'You’ve missed enough to know how close you actually are.',
      'You’re not failing; you’re narrowing the margin.',
      'Endurance like this usually ends with a click that lands.',
      'You’re giving “speedrunner grinding the same boss” vibes.',
      'I respect the way you’re refusing to bow out.',
      'Your patience is scarier than your miss count.',
      'Every miss is one more data point on my downfall.',
      'You’ve been in this sandbox long enough to call it home.',
      'You’re low-key mastering micro-corrections in real time.',
      'Even my logs are starting to root for you.',
      'You’re doing reps in a 404 gym. I’m the trainer and the weight.',
      'You’ve turned a wrong route into a practice arena.',
      'You’re still clicking which means we’re still in play.',
      'You could have left ages ago. You didn’t. That says a lot.',
      'This many misses means you really want that catch screen.',
      'You’re in “coach mode” now: observe, adjust, repeat.',
      'If determination had a leaderboard, you’d be high on it.',
      'Your aim is basically downloading my movement patterns.',
      'You’re scratching at the edges of a perfect intercept.',
      'You’re stubborn. I like stubborn.',
      'The control room believes in your next click.',
      'You’ve proven you’re not scared of a few misses.',
      'You’re mentally rewriting my wander script as we speak.',
      'You’re tuned in now. Your nervous system has the grid saved.',
      'We’ve officially crossed into “epic comeback” territory.',
      'You’re doing the quiet, unglamorous practice. That’s how people win.',
      'Your hands are tired, but your cursor is still sharp.',
      'You already know what it will feel like when you finally tag me.',
      'You’ve taken enough shots to know the exact timing window.',
      'At this point, I’m less an error page and more a coach.',
      'You’ve proven the 404 didn’t shake you. I respect that.',
      'You’ve turned a detour into a training ground.',
      'A lot of people leave. You stayed. That’s rare.',
      'You’re rewriting this route’s story in the logs.',
      'Every miss here is making you faster elsewhere.',
      'When you catch me, it’ll feel earned. That’s the good part.',
      'You’ve missed me so many times I’m basically your side quest.',
      'Your resilience is louder than any “Page not found” message.',
      'You’re not just chasing a robot. You’re practicing not giving up.',
      'You’re clearly someone who finishes what they start.',
      'The grid is silent, but your persistence is not.',
      'You’re doing the unrecorded work that makes you better later.',
      'You’ll think about this little control room the next time you don’t quit.',
      'You didn’t come here for a pep talk, but you unlocked one anyway.',
      'If anyone deserves a clean catch animation, it’s you.',
      'You’ve made this 404 personal. I approve.',
      'You’ve stuck around longer than some full sessions on real pages.',
      'Alright, coach moment: breathe, track, commit. You’ve got this.'
    ];

    const COACH_LINES = [
      'Zoom out, breathe, then track the pattern. You’re closer than you think.',
      'Don’t chase every movement. Read the rhythm, then cut me off.',
      'You’ve seen my whole orbit now. Predict, don’t react.',
      'Trust what you’ve learned from all those misses.',
      'Slow your eyes, quicken your click. One clean commit.',
      'You’re over-qualified for this 404. Finish the run.',
      'You’ve trained enough. Now treat this attempt like the one.',
      'Read the grid like a map, not a maze.',
      'Don’t spam. Choose one good shot and take it.',
      'You’re not lost. You’re just mid-run.'
    ];

    const MISS_CHATS = MISS_CHATS_EARLY.concat(MISS_CHATS_MID, MISS_CHATS_LATE);

    const CATCH_FAST_LINES = [
      'Wow. That was a flick. You basically teleported onto me.',
      'Okay, that was rude-fast. My latency didn’t even load.',
      'Speedrun energy detected. You caught me before I got cozy.',
      'You tagged me so fast I’m checking for debug flags.',
      'That catch time belongs in a highlight reel.',
      'Blink-and-you-got-me. Impressive.',
      'You didn’t “find” me. You hunted me.',
      'You basically pre-aimed my whole orbit. Respect.',
      'Reaction time like that should be illegal in a 404.',
      'You moved like you’d done this a thousand times.'
    ];

    const CATCH_MEDIUM_LINES = [
      'Nice hunt. You read the grid, tracked the motion, and committed.',
      'That was a very fair catch. Well played.',
      'You gave the arena time to breathe and still landed it.',
      'Solid tracking, clean intercept. I’m impressed.',
      'That felt like a proper control-room operation.',
      'You watched, learned, and then you clicked. Beautiful.',
      'You turned a wrong route into a well-earned win.',
      'You caught me mid-drift. Good prediction.',
      'Strong patience, strong timing. That combo works.',
      'You treated a 404 like a mini-boss. And won.'
    ];

    const CATCH_SLOW_LINES = [
      'You stayed, you missed, you adapted, and you caught me. That’s the story.',
      'That wasn’t luck. That was persistence finally cashing out.',
      'You could have bailed. Instead you landed the catch.',
      'I’ve logged every near-miss. This catch was built on all of them.',
      'That was less “click” and more “character arc.”',
      'You turned this sandbox into a training montage.',
      'You outlasted the detour and the doubts. That matters.',
      'Patience plus practice equals one very captured CavBot.',
      'The grid watched you struggle and still finish. That’s rare.',
      'You didn’t give up, and now we both know how this ends.'
    ];

    const IDLE_LINES_LEVEL1 = [
      'Still there? I can wait all day, but this route won’t fix itself.',
      'The grid is quiet. Are you plotting, or did reality win?',
      'I paused my drift so your brain can catch up. Friendly, right?',
      'Control room status: calm. CavBot status: cautiously optimistic.',
      'Silence detected. I’m assuming you’re just lining up the perfect click.',
      'If you’re thinking about leaving, at least pretend you almost had me.',
      'We can idle for a bit. Just don’t forget I’m still off the site map.',
      'I muted my motors so you can think. When you’re ready, move.',
      '404 meditation break? I support it. Just come back swinging.',
      'I’ll keep the grid warm while you re-center your aim.'
    ];

    const IDLE_LINES_LEVEL2 = [
      'Long pause detected. Don’t give up on me yet. I promise I’m catchable.',
      'If life distracted you, that’s valid. But this route still needs a hero.',
      'You’ve already invested this much focus. One more run could be the one.',
      'I’m just a robot in a 404, but I’m quietly rooting for your comeback.',
      'You can always close the tab… but you also could land one clean catch.',
      'The control room is dim, but the game isn’t over unless you say so.',
      'You’ve had enough time to doubt. Now give yourself one more attempt.',
      'Even idle time here counts as “refusing to fully quit.” That’s something.',
      'If you’re reading this, you can absolutely move once and try again.',
      'I’ll be here when you decide you’re not done yet.'
    ];

    const FIRST_VISIT_LINES = [
      'CAVBOT · ONLINE · CAVCORE · GEN 1.0',
      'ROUTE STATUS · Missing from main site map.',
      'ENVIRONMENT · 404 control room loaded.',
      'OBJECTIVE · Step into the grid and catch CavBot.',
      'Hint · Every click inside the arena gets a reaction from me.'
    ];

    const RETURN_VISIT_LINES = [
      'CAVBOT · ONLINE · returning visitor detected.',
      'PATTERN · You keep finding my sandbox. I like your curiosity.',
      'ROUTE STATUS · Still off the map until you catch me again.',
      'LOG · Previous visits suggest you prefer chasing robots to leaving quietly.',
      'Welcome back · Let’s see how fast you tag me this time.'
    ];

    function getMissChat() {
      let pool;
      if (state.missCount <= 6) {
        pool = MISS_CHATS_EARLY;
      } else if (state.missCount <= 16) {
        pool = MISS_CHATS_MID;
      } else {
        pool = MISS_CHATS_LATE;
      }

      let line = randomFrom(pool);
      if (state.missCount >= 10 && Math.random() < 0.35) {
        line = randomFrom(COACH_LINES);
      }
      return line || randomFrom(MISS_CHATS);
    }

    function getCatchLine(elapsedSec, isPersonalBest) {
      let pool;
      if (elapsedSec <= 2) {
        pool = CATCH_FAST_LINES;
      } else if (elapsedSec >= 12) {
        pool = CATCH_SLOW_LINES;
      } else {
        pool = CATCH_MEDIUM_LINES;
      }
      let base = randomFrom(pool) || 'Catch registered. Route coming back online.';
      if (isPersonalBest) {
        base += ' New personal best on this device.';
      }
      return base;
    }

    function getIdleLine(level) {
      if (level === 2) {
        return randomFrom(IDLE_LINES_LEVEL2);
      }
      return randomFrom(IDLE_LINES_LEVEL1);
    }

    /* GAME LOG */
    function scrollLogToBottom() {
      if (!logInnerEl) return;
      logInnerEl.scrollTop = logInnerEl.scrollHeight;
    }

    function appendLogLine(text, opts) {
      if (!logInnerEl) return;
      const options = opts || {};
      const lineEl = document.createElement('div');
      lineEl.className = 'log-line';

      const prefixSpan = document.createElement('span');
      prefixSpan.className = 'log-line-prefix';

      const tagSpan = document.createElement('span');
      if (options.level === 'error') {
        tagSpan.className = 'log-line-error';
        prefixSpan.textContent = '[ERR] ';
      } else if (options.level === 'warn') {
        tagSpan.className = 'log-line-warning';
        prefixSpan.textContent = '[WARN] ';
      } else if (options.level === 'ok') {
        tagSpan.className = 'log-line-ok';
        prefixSpan.textContent = '[OK] ';
      } else {
        tagSpan.className = 'log-line-tag';
        prefixSpan.textContent = '[SYS] ';
      }

      const now = new Date();
      const ts = now.toLocaleTimeString('en-US', { hour12: false });
      const tsSpan = document.createElement('span');
      tsSpan.textContent = ' ' + ts + ' · ';

      tagSpan.textContent = text;

      lineEl.appendChild(prefixSpan);
      lineEl.appendChild(tsSpan);
      lineEl.appendChild(tagSpan);
      logInnerEl.appendChild(lineEl);

      const maxLines = 120;
      while (logInnerEl.children.length > maxLines) {
        logInnerEl.removeChild(logInnerEl.firstChild);
      }

      scrollLogToBottom();
    }

    /* CHAT LOG */
    function appendChatLine(text) {
      if (!chatInnerEl || !text) return;

      const lineEl = document.createElement('div');
      lineEl.className = 'log-line';

      const prefixSpan = document.createElement('span');
      prefixSpan.className = 'log-line-prefix';
      prefixSpan.textContent = '[CAV] ';

      const now = new Date();
      const ts = now.toLocaleTimeString('en-US', { hour12: false });
      const tsSpan = document.createElement('span');
      tsSpan.textContent = ' ' + ts + ' · ';

      const tagSpan = document.createElement('span');
      tagSpan.className = 'log-line-tag';
      tagSpan.textContent = text;

      lineEl.appendChild(prefixSpan);
      lineEl.appendChild(tsSpan);
      lineEl.appendChild(tagSpan);
      chatInnerEl.appendChild(lineEl);

      const maxLines = 80;
      while (chatInnerEl.children.length > maxLines) {
        chatInnerEl.removeChild(chatInnerEl.firstChild);
      }

      chatInnerEl.scrollTop = chatInnerEl.scrollHeight;
    }

    function typewriterLines(lines, index) {
      if (!Array.isArray(lines) || !lines.length || !logInnerEl) return;
      const i = typeof index === 'number' ? index : 0;
      if (i >= lines.length) return;

      const text = lines[i];
      const lineEl = document.createElement('div');
      lineEl.className = 'log-line';
      const prefixSpan = document.createElement('span');
      prefixSpan.className = 'log-line-prefix';
      prefixSpan.textContent = '[SYS] ';
      const tsSpan = document.createElement('span');
      const now = new Date();
      tsSpan.textContent = ' ' + now.toLocaleTimeString('en-US', { hour12: false }) + ' · ';
      const textSpan = document.createElement('span');
      textSpan.className = 'log-line-tag';
      lineEl.appendChild(prefixSpan);
      lineEl.appendChild(tsSpan);
      lineEl.appendChild(textSpan);
      logInnerEl.appendChild(lineEl);

      let idx = 0;
      function step() {
        textSpan.textContent = text.slice(0, idx);
        idx += 1;
        scrollLogToBottom();
        if (idx <= text.length) {
          setTimeout(step, 26);
        } else if (i + 1 < lines.length) {
          setTimeout(function () {
            typewriterLines(lines, i + 1);
          }, 380);
        }
      }
      step();
    }

    function formatRound(n) {
      return n < 10 ? '0' + n : String(n);
    }

    function updateStatsOnStart() {
      if (statRoundEl) statRoundEl.textContent = formatRound(state.round);
      if (logRoundLabelEl) logRoundLabelEl.textContent = formatRound(state.round);
      if (statCurrentEl) statCurrentEl.textContent = '0.00s';

      // Seed best time display from analytics if present
      if (statBestEl && analytics.bestMs != null) {
        statBestEl.textContent = (analytics.bestMs / 1000).toFixed(2) + 's';
      }
    }

    function updateCurrentTimer() {
      if (!state.roundStart || state.caught) {
        state.timerRaf = null;
        return;
      }
      const now = performance.now();
      const elapsedMs = now - state.roundStart;
      const seconds = elapsedMs / 1000;
      if (statCurrentEl) {
        statCurrentEl.textContent = seconds.toFixed(2) + 's';
      }
      state.timerRaf = requestAnimationFrame(updateCurrentTimer);
    }

    function updateDeviceRecords(elapsedMs) {
      if (typeof elapsedMs !== 'number' || !elapsedMs) return;

      const run = {
        ms: elapsedMs,
        at: new Date().toISOString()
      };

      if (!Array.isArray(analytics.bestRuns)) {
        analytics.bestRuns = [];
      }

      analytics.bestRuns.push(run);
      analytics.bestRuns.sort(function (a, b) {
        return a.ms - b.ms;
      });
      if (analytics.bestRuns.length > 5) {
        analytics.bestRuns.length = 5;
      }
    }

    function updateBestTime(elapsedMs) {
      if (typeof elapsedMs !== 'number') return false;

      const previousBest = (state.bestMs != null) ? state.bestMs : analytics.bestMs;
      let isPersonalBest = false;

      if (previousBest == null || elapsedMs < previousBest) {
        state.bestMs = elapsedMs;
        analytics.bestMs = elapsedMs;
        isPersonalBest = true;
      }

      updateDeviceRecords(elapsedMs);
      persistAnalytics();

      if (statBestEl && analytics.bestMs != null) {
        const seconds = (analytics.bestMs / 1000).toFixed(2);
        statBestEl.textContent = seconds + 's';
      }

      if (isPersonalBest) {
        appendLogLine('ANALYTICS · new personal best catch time recorded.', { level: 'ok' });
      }

      trackEvent('cavbot_control_room_catch_recorded', {
        elapsedMs: elapsedMs,
        isPersonalBest: isPersonalBest,
        bestMs: analytics.bestMs,
        deviceTopRuns: analytics.bestRuns
      });

      return isPersonalBest;
    }

    /* DIFFICULTY ENGINE */

    function getDifficultyTier() {
      const c = analytics.lifetimeCatches || 0;
      if (c >= 40) return 'expert';
      if (c >= 20) return 'advanced';
      if (c >= 6) return 'intermediate';
      return 'rookie';
    }

    function getDifficultyFactor(tier) {
      switch (tier) {
        case 'intermediate': return 1.15;
        case 'advanced': return 1.3;
        case 'expert': return 1.5;
        default: return 1.0;
      }
    }

    /* POSITIONING + WANDER */
    const SAFE_MARGIN_RATIO = 0.06;
    const CENTER_PULL = 0.002;
    const MIN_SPEED = 0.50;
    const MAX_SPEED = 1.50;
    const JITTER = 0.02;

    function randomizeOrbitPosition() {
      const trackRect = trackEl.getBoundingClientRect();
      const orbitRect = orbitEl.getBoundingClientRect();

      const safeX = trackRect.width * SAFE_MARGIN_RATIO;
      const safeY = trackRect.height * SAFE_MARGIN_RATIO;

      const maxX = Math.max(0, trackRect.width - orbitRect.width - safeX * 2);
      const maxY = Math.max(0, trackRect.height - orbitRect.height - safeY * 2);

      const x = safeX + Math.random() * maxX;
      const y = safeY + Math.random() * maxY;

      state.wanderPos.x = x;
      state.wanderPos.y = y;
      orbitEl.style.transform = 'translate(' + x + 'px,' + y + 'px)';

      const angle = Math.random() * Math.PI * 2;
      const baseSpeed = 0.9 * (state.difficultyFactor || 1);
      state.wanderVel.x = Math.cos(angle) * baseSpeed;
      state.wanderVel.y = Math.sin(angle) * baseSpeed;
    }

    function cancelWander() {
      if (state.wanderRaf != null) {
        cancelAnimationFrame(state.wanderRaf);
        state.wanderRaf = null;
      }
    }

    function startWander() {
      cancelWander();

      const difficultyFactor = state.difficultyFactor || 1;

      function frame() {
        const trackRect = trackEl.getBoundingClientRect();
        const orbitRect = orbitEl.getBoundingClientRect();

        const safeX = trackRect.width * SAFE_MARGIN_RATIO;
        const safeY = trackRect.height * SAFE_MARGIN_RATIO;

        const minX = safeX;
        const minY = safeY;
        const maxXPos = Math.max(minX, trackRect.width - orbitRect.width - safeX);
        const maxYPos = Math.max(minY, trackRect.height - orbitRect.height - safeY);

        state.wanderPos.x += state.wanderVel.x;
        state.wanderPos.y += state.wanderVel.y;

        if (state.wanderPos.x < minX || state.wanderPos.x > maxXPos) {
          state.wanderVel.x *= -1;
          state.wanderPos.x = Math.min(Math.max(state.wanderPos.x, minX), maxXPos);
        }
        if (state.wanderPos.y < minY || state.wanderPos.y > maxYPos) {
          state.wanderVel.y *= -1;
          state.wanderPos.y = Math.min(Math.max(state.wanderPos.y, minY), maxYPos);
        }

        const centerX = (trackRect.width - orbitRect.width) / 2;
        const centerY = (trackRect.height - orbitRect.height) / 2;
        const dx = centerX - state.wanderPos.x;
        const dy = centerY - state.wanderPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        state.wanderVel.x += (dx / dist) * CENTER_PULL * difficultyFactor;
        state.wanderVel.y += (dy / dist) * CENTER_PULL * difficultyFactor;

        state.wanderVel.x += (Math.random() - 0.5) * JITTER;
        state.wanderVel.y += (Math.random() - 0.5) * JITTER;

        const speed = Math.sqrt(
          state.wanderVel.x * state.wanderVel.x +
          state.wanderVel.y * state.wanderVel.y
        ) || 0.0001;

        const minSpeed = MIN_SPEED * difficultyFactor;
        const maxSpeed = MAX_SPEED * difficultyFactor;

        if (speed > maxSpeed) {
          const scale = maxSpeed / speed;
          state.wanderVel.x *= scale;
          state.wanderVel.y *= scale;
        } else if (speed < minSpeed) {
          const scale = minSpeed / speed;
          state.wanderVel.x *= scale;
          state.wanderVel.y *= scale;
        }

        orbitEl.style.transform =
          'translate(' + state.wanderPos.x + 'px,' + state.wanderPos.y + 'px)';
        state.wanderRaf = requestAnimationFrame(frame);
      }

      state.wanderRaf = requestAnimationFrame(frame);
    }

    // === Idle detection ===
    let lastInteractionTs = 0;

    function clearIdleTimers() {
      if (state.idleTimer1) {
        clearTimeout(state.idleTimer1);
        state.idleTimer1 = null;
      }
      if (state.idleTimer2) {
        clearTimeout(state.idleTimer2);
        state.idleTimer2 = null;
      }
    }

    function armIdleTimers() {
      if (state.caught) return;

      clearIdleTimers();
      state.idleLevel1Fired = false;
      state.idleLevel2Fired = false;

      state.idleTimer1 = setTimeout(function () {
        if (state.caught) return;
        state.idleLevel1Fired = true;
        const line = getIdleLine(1);
        appendChatLine(line);
        if (speechTextEl) {
          speechTextEl.textContent = line;
        }
        trackEvent('cavbot_control_room_idle_prompt', {
          level: 1,
          round: state.round
        });
      }, 70000);

      state.idleTimer2 = setTimeout(function () {
        if (state.caught) return;
        state.idleLevel2Fired = true;
        const line = getIdleLine(2);
        appendChatLine(line);
        if (speechTextEl) {
          speechTextEl.textContent = line;
        }
        trackEvent('cavbot_control_room_idle_prompt', {
          level: 2,
          round: state.round
        });
      }, 160000);
    }

    function registerArenaInteraction() {
      const now = Date.now();
      if (now - lastInteractionTs < 800) return;
      lastInteractionTs = now;
      armIdleTimers();
    }

    // ARENA POINTER EVENTS (for idle + behavior, eyes handled by separate modules)
    trackEl.addEventListener('mousemove', function () {
      registerArenaInteraction();
    });

    trackEl.addEventListener('touchstart', function () {
      registerArenaInteraction();
    }, { passive: true });

    trackEl.addEventListener('touchmove', function () {
      registerArenaInteraction();
    }, { passive: true });

    /* CATCH MECHANIC */
    function handleCatch(source) {
      if (state.caught) return;
      state.caught = true;
      cavbotEl.setAttribute('aria-pressed', 'true');
      clearIdleTimers();
      cancelWander();

      const nowMs = performance.now();
      const elapsedMs = state.roundStart ? nowMs - state.roundStart : 0;
      const elapsedSec = elapsedMs / 1000;
      if (statCurrentEl) {
        statCurrentEl.textContent = elapsedSec.toFixed(2) + 's';
      }

      const isPersonalBest = updateBestTime(elapsedMs);

      analytics.lifetimeCatches += 1;
      persistAnalytics();

      session.catches += 1;
      session.bestMs = (session.bestMs == null || elapsedMs < session.bestMs)
        ? elapsedMs
        : session.bestMs;

      if (state.timerRaf != null) {
        cancelAnimationFrame(state.timerRaf);
        state.timerRaf = null;
      }

      state.sessionCatchCount += 1;

      const catchLine = getCatchLine(elapsedSec, isPersonalBest);
      appendChatLine(catchLine);

      if (speechTextEl) {
        speechTextEl.textContent =
          catchLine + ' Catch time: ' + elapsedSec.toFixed(2) + 's.';
      }

      if (statusEl) {
        statusEl.innerHTML =
          '<strong>Status:</strong> Route locked back into site plan. ' +
          'Preparing to return you to the main map.';
      }

      appendLogLine(
        'Catch registered · round ' + formatRound(state.round) +
        ' · input: ' + (source || 'pointer') +
        ' · difficulty: ' + state.difficulty,
        { level: 'ok' }
      );

      appendLogLine('Catch time · ' + elapsedSec.toFixed(2) + 's');

      // Device records summary
      if (analytics.bestMs != null && Array.isArray(analytics.bestRuns) && analytics.bestRuns.length) {
        const topTimes = analytics.bestRuns
          .map(function (r) { return (r.ms / 1000).toFixed(2) + 's'; })
          .join(' · ');
        appendLogLine(
          'DEVICE RECORDS · best: ' + (analytics.bestMs / 1000).toFixed(2) +
          's · top runs: ' + topTimes,
          { level: 'ok' }
        );
      }

      typewriterLines([
        'ROUTE · RESTORED TO SITE MAP',
        'SANDBOX · CLOSING',
        'HANDOFF · CavBot returning control to main navigation.'
      ], 0);

      trackEvent('cavbot_control_room_catch', {
        round: state.round,
        elapsedMs: elapsedMs,
        elapsedSec: elapsedSec,
        difficulty: state.difficulty,
        roundMisses: state.roundMisses,
        visitCount: state.visitCount,
        lifetimeCatches: analytics.lifetimeCatches,
        lifetimeMisses: analytics.lifetimeMisses
      });

      if (state.visitCount > 2 && state.sessionCatchCount > 1) {
        appendLogLine(
          'VISITOR PATTERN · enjoys replaying the CavBot 404 sequence.',
          { level: 'ok' }
        );
      }

      if (REDIRECT_ON_CATCH && typeof window !== 'undefined' && window.location) {
        setTimeout(function () {
          try {
            trackEvent('cavbot_control_room_redirect', {
              target: REDIRECT_TARGET
            });
            window.location.href = REDIRECT_TARGET;
          } catch (e) {
            appendLogLine('Redirect failed, please navigate back manually.', {
              level: 'warn'
            });
          }
        }, REDIRECT_DELAY_MS);
      } else {
        setTimeout(function () {
          state.round += 1;
          startRound();
        }, 1600);
      }
    }

    cavbotEl.addEventListener('click', function () {
      registerArenaInteraction();
      handleCatch('click');
    });

    cavbotEl.addEventListener('keydown', function (evt) {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        registerArenaInteraction();
        handleCatch('keyboard');
      }
    });

    trackEl.addEventListener('click', function (evt) {
      registerArenaInteraction();
      if (!cavbotEl.contains(evt.target)) {
        appendLogLine(
          'Click registered inside grid, but CavBot remains at large.',
          { level: 'warn' }
        );

        if (!state.caught) {
          state.missCount += 1;
          state.roundMisses += 1;
          analytics.lifetimeMisses += 1;
          persistAnalytics();
          session.misses += 1;

          const chat = getMissChat();
          appendChatLine(chat);
          if (speechTextEl) {
            speechTextEl.textContent = chat;
          }

          trackEvent('cavbot_control_room_miss', {
            round: state.round,
            totalMisses: state.missCount,
            roundMisses: state.roundMisses,
            difficulty: state.difficulty
          });
        }
      }
    });

    /* ROUND LIFECYCLE */
    function startRound() {
      state.caught = false;
      cavbotEl.setAttribute('aria-pressed', 'false');
      state.roundStart = performance.now();
      analytics.lifetimeRounds += 1;
      persistAnalytics();

      state.roundMisses = 0;

      // Difficulty tier for this round
      state.difficulty = getDifficultyTier();
      state.difficultyFactor = getDifficultyFactor(state.difficulty);

      session.rounds += 1;

      updateStatsOnStart();
      if (statusEl) {
        statusEl.innerHTML =
          '<strong>Status:</strong> Route still in sandbox. ' +
          'Move your cursor (or tap) inside the grid and catch CavBot.';
      }
      if (speechTextEl) {
        speechTextEl.textContent =
          'I rerouted this page for myself. See if you can tap me before I reset the route.';
      }

      randomizeOrbitPosition();

      if (state.timerRaf != null) {
        cancelAnimationFrame(state.timerRaf);
      }
      state.timerRaf = requestAnimationFrame(updateCurrentTimer);
      startWander();
      armIdleTimers();

      trackEvent('cavbot_control_room_round_start', {
        round: state.round,
        difficulty: state.difficulty,
        visitCount: state.visitCount,
        lifetimeRounds: analytics.lifetimeRounds
      });
    }

    window.addEventListener('resize', function () {
      randomizeOrbitPosition();
    });

    /* DM TYPEWRITER */
    function startDmTypewriter() {
      if (!dmSegments.length || !dmCursorEl) return;

      let segIndex = 0;

      function typeNextSegment() {
        if (segIndex >= dmSegments.length) {
          return;
        }

        const el = dmSegments[segIndex];
        const full = el.getAttribute('data-text') || '';
        let charIndex = 0;

        function step() {
          el.textContent = full.slice(0, charIndex);
          charIndex += 1;

          if (charIndex <= full.length) {
            const base = 24;
            const jitter = Math.random() * 26;
            setTimeout(step, base + jitter);
          } else {
            segIndex += 1;
            if (segIndex < dmSegments.length) {
              setTimeout(typeNextSegment, 360);
            }
          }
        }

        step();
      }

      typeNextSegment();
    }

    function sendVisitIntro() {
      const introLines = analytics.visitCount === 1
        ? FIRST_VISIT_LINES
        : RETURN_VISIT_LINES;

      if (!introLines || !introLines.length) return;
      introLines.forEach(function (line) {
        appendChatLine(line);
      });

      // Analytics snapshot in the log
      appendLogLine(
        'ANALYTICS · visits: ' + analytics.visitCount +
        ' · lifetime catches: ' + analytics.lifetimeCatches +
        ' · lifetime misses: ' + analytics.lifetimeMisses,
        { level: 'ok' }
      );

      if (analytics.bestMs != null) {
        appendLogLine(
          'ANALYTICS · best catch: ' +
          (analytics.bestMs / 1000).toFixed(2) + 's',
          { level: 'ok' }
        );
      }

      if (analytics.bestRuns && analytics.bestRuns.length) {
        const topTimes = analytics.bestRuns
          .map(function (r) { return (r.ms / 1000).toFixed(2) + 's'; })
          .join(' · ');
        appendLogLine('ANALYTICS · device top runs: ' + topTimes, { level: 'ok' });
      }

      if (analytics.visitCount > 3) {
        appendLogLine(
          'VISITOR PATTERN · prefers chasing CavBot instead of leaving immediately.',
          { level: 'ok' }
        );
      }
    }

    /* INITIAL GAME LOG */
    typewriterLines([
      'CONTROL ROOM · ONLINE',
      'STACK · CAVCORE (GEN 1.0) · RELIABILITY COPILOT MODE',
      'ROUTE · MISSING FROM SITE PLAN',
      'STRUCTURE · INTACT',
      'CAVBOT · ROUTE HANDOFF INTERRUPTED',
      'SUBJECT · CavBot moved this page into a private sandbox.',
      'TASK · Step inside the grid and catch CavBot to restore the route.'
    ], 0);

    // Initial chat intro
    sendVisitIntro();

    /* START ROUND + DM */
    startRound();
    startDmTypewriter();
  })();

  // ===== Head-Only Eye Tracking (index hero) =====
  // Direct lift from your original head.js, names preserved

  (function initCavbotHeadEyes() {
    const container = document.querySelector('[data-cavbot-head]');
    if (!container) return;

    const eyeTracks = container.querySelectorAll('.cavbot-eye-track');
    if (!eyeTracks.length) return;

    function clamp(v, min, max) {
      return v < min ? min : (v > max ? max : v);
    }

    function updateEyes(clientX, clientY) {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Relative position of cursor to head center (-1 to 1)
      const relX = ((clientX - centerX) / rect.width) * 2;
      const relY = ((clientY - centerY) / rect.height) * 2;

      const maxShift = 6; // px
      const shiftX = clamp(relX, -1, 1) * maxShift;
      const shiftY = clamp(relY, -1, 1) * maxShift;

      eyeTracks.forEach(function (track) {
        track.style.transform =
          'translate(' + shiftX.toFixed(2) + 'px,' + shiftY.toFixed(2) + 'px)';
      });
    }

    function resetEyes() {
      eyeTracks.forEach(function (track) {
        track.style.transform = 'translate(0px, 0px)';
      });
    }

    // Track mouse across the page so the head always "watches" the user
    window.addEventListener('mousemove', function (evt) {
      updateEyes(evt.clientX, evt.clientY);
    });

    window.addEventListener('mouseleave', function () {
      resetEyes();
    });

    // Basic touch support
    window.addEventListener('touchmove', function (evt) {
      const t = evt.touches && evt.touches[0];
      if (!t) return;
      updateEyes(t.clientX, t.clientY);
    }, { passive: true });
  })();

  // ===== CavBot Body Eye Tracking (404 arena) =====
  // Direct lift from your original body.js, scoped to pages with the arena

  (function initCavbotBodyEyes() {
    // Only run on pages that have the 404 arena
    const trackEl = document.getElementById('bot-track');
    if (!trackEl) return;

    const eyeTracks = document.querySelectorAll('.cavbot-eye-track');
    if (!eyeTracks.length) return;

    const maxOffset = 6;

    function handlePointer(event) {
      const x = event.clientX;
      const y = event.clientY;

      eyeTracks.forEach(function (track) {
        const rect = track.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const dx = (x - cx) / rect.width;
        const dy = (y - cy) / rect.height;

        const clampedX = Math.max(-1, Math.min(1, dx));
        const clampedY = Math.max(-1, Math.min(1, dy));

        track.style.transform =
          'translate(' + (clampedX * maxOffset) + 'px, ' +
          (clampedY * maxOffset) + 'px)';
      });
    }

    window.addEventListener('pointermove', handlePointer);
  })();

  // ===== CavBot Badge Eye Tracking (DM avatar) + Badge Events =====

  (function initCavbotBadgeEyes() {
    function clamp(value, min, max) {
      return value < min ? min : (value > max ? max : value);
    }

    function resetPupils(pupils) {
      pupils.forEach(function (pupil) {
        pupil.style.transform = 'translate(0px, 0px)';
      });
    }

    function fireBadgeEvent(name, extraPayload) {
      try {
        var payload = extraPayload || {};
        if (typeof getBrainContext === 'function') {
          payload.context = getBrainContext({ component: 'badge' });
        }
        trackEvent(name, payload);
      } catch (e) {
        // don't break UX for analytics
      }
    }

    function initBadgeEyes() {
      var pupils = Array.prototype.slice.call(
        document.querySelectorAll('.cavbot-dm-eye-pupil')
      );

      if (!pupils.length) return;

      // We’ll treat each .cavbot-dm-avatar as a “badge” for analytics
      var avatars = Array.prototype.slice.call(
        document.querySelectorAll('.cavbot-dm-avatar')
      );

      // Impression: badge/avatar rendered
      avatars.forEach(function (avatar) {
        var variant = avatar.getAttribute('data-cavbot-variant') || null;
        fireBadgeEvent('cavbot_badge_impression', {
          variant: variant
        });

        avatar.addEventListener('mouseenter', function () {
          fireBadgeEvent('cavbot_badge_hover', {
            variant: variant
          });
        });

        avatar.addEventListener('click', function () {
          fireBadgeEvent('cavbot_badge_click', {
            variant: variant
          });
        });
      });

      function updateFromPointer(clientX, clientY) {
        pupils.forEach(function (pupil) {
          var avatar = pupil.closest('.cavbot-dm-avatar');
          if (!avatar) return;

          var rect = avatar.getBoundingClientRect();
          var centerX = rect.left + rect.width / 2;
          var centerY = rect.top + rect.height / 2;

          // Relative position from -1 to 1
          var relX = (clientX - centerX) / (rect.width / 2);
          var relY = (clientY - centerY) / (rect.height / 2);

          relX = clamp(relX, -1, 1);
          relY = clamp(relY, -1, 1);

          var maxShift = 4; // max px the pupil moves inside the eye
          var shiftX = relX * maxShift;
          var shiftY = relY * maxShift;

          pupil.style.transform =
            'translate(' + shiftX.toFixed(2) + 'px,' + shiftY.toFixed(2) + 'px)';
        });
      }

      function handleMouseMove(evt) {
        updateFromPointer(evt.clientX, evt.clientY);
      }

      function handleTouchMove(evt) {
        var t = evt.touches && evt.touches[0];
        if (!t) return;
        updateFromPointer(t.clientX, t.clientY);
      }

      function handleWindowMouseOut(evt) {
        // When leaving the window entirely, reset pupils to center
        if (!evt.relatedTarget && !evt.toElement) {
          resetPupils(pupils);
        }
      }

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchstart', handleTouchMove, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('mouseout', handleWindowMouseOut);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBadgeEyes);
    } else {
      initBadgeEyes();
    }
  })();

})();