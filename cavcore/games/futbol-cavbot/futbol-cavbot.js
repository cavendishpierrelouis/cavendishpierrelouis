/* ==========================================================
  Control Room Futbol · CavBot FC
  ========================================================== */
(function(){
  'use strict';

  function randomFrom(arr){
    if(!arr || !arr.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ==========================================================
    CavBot Brain fallback (so single-file works too)
    ========================================================== */
  if(!window.cavbotBrain){
    var LS_KEY = 'cavbot_analytics';
    function load(){
      try{ return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; }catch(e){ return {}; }
    }
    function save(obj){
      try{ localStorage.setItem(LS_KEY, JSON.stringify(obj||{})); }catch(e){}
    }
    window.cavbotBrain = {
      _internal: {
        analytics: load(),
        session: { id: 'local-' + Math.random().toString(16).slice(2) },
        persistAnalytics: function(){ save(window.cavbotBrain._internal.analytics); },
        trackEvent: function(){ /* no-op fallback */ }
      }
    };
  }

  if(!window.cavbotBrain || !window.cavbotBrain._internal){
    return;
  }

  var analytics = window.cavbotBrain._internal.analytics;
  var session = window.cavbotBrain._internal.session;
  var persistAnalytics = window.cavbotBrain._internal.persistAnalytics;
  var trackEvent = window.cavbotBrain._internal.trackEvent;

  // Futbol analytics fields (persisted inside same object)
  analytics.futbolMatches = analytics.futbolMatches || 0;
  analytics.futbolWins = analytics.futbolWins || 0;
  analytics.futbolLosses = analytics.futbolLosses || 0;
  analytics.futbolBestStreak = analytics.futbolBestStreak || 0;
  analytics.futbolFastestWinMs = analytics.futbolFastestWinMs || null;
  analytics.futbolLifetimeGoals = analytics.futbolLifetimeGoals || 0;
  analytics.futbolLifetimeShots = analytics.futbolLifetimeShots || 0;

  /* ==========================================================
    (FIX #2) 6 LEVELS (C A V B O T) — persisted across returns
    - NEW RULE: level advances every time they come back
      (i.e., after every match end, win OR loss)
    - after level 6 -> reset back to level 1 (C)
    ========================================================== */
  analytics.futbolLevel = analytics.futbolLevel || 1;
  function levelLabel(n){
    var letters = ['C','A','V','B','O','T'];
    var L = letters[Math.max(0, Math.min(5, (n||1)-1))];
    return 'LEVEL ' + (n<10?('0'+n):n) + ' · ' + L;
  }

  // DOM
  var pitch = document.getElementById('futbol-pitch');
  var actorPlayer = document.getElementById('actor-player');
  var actorImposter = document.getElementById('actor-imposter');
  var ballEl = document.getElementById('ball');

  var scoreYouEl = document.getElementById('score-you');
  var scoreBotEl = document.getElementById('score-bot');

  var statMatchEl = document.getElementById('stat-match');
  var statTimerEl = document.getElementById('stat-timer');
  var statBestStreakEl = document.getElementById('stat-best-streak');
  var statDifficultyEl = document.getElementById('stat-difficulty');
  var statRecordEl = document.getElementById('stat-record');

  var gameLogInner = document.getElementById('game-log-inner');
  var chatLogInner = document.getElementById('chat-log-inner');

  var arenaSpeech = document.getElementById('arena-speech');
  var arenaSpeechText = document.getElementById('arena-speech-text');

  var dmLineEl = document.getElementById('cavbot-dm-line');
  var dmCursorEl = document.getElementById('cavbot-dm-cursor');
  var dmSegments = dmLineEl ? Array.prototype.slice.call(dmLineEl.querySelectorAll('.cavbot-dm-segment')) : [];

  var btnReset = document.getElementById('btn-reset');
  var btnSound = document.getElementById('btn-sound');
  var soundStateEl = document.getElementById('sound-state');

  var analogStick = document.getElementById('analog-stick');
  var analogBase = document.getElementById('analog-base');
  var analogKnob = document.getElementById('analog-knob');

  if(!pitch || !actorPlayer || !actorImposter || !ballEl) return;

  // ==========================================================
  // NEW RULE: Always redirect to /3800 (index) after match end
  // ==========================================================
  var INDEX_URL = '/';

  // Restore Route (kept, but forced to index)
  function getRestoreUrl(){
    return INDEX_URL;
  }

  var RESTORE_URL = getRestoreUrl();
  var restoreScheduled = false;

  // Logging
  function scrollToBottom(el){ if(el) el.scrollTop = el.scrollHeight; }

  function appendLog(inner, text, level){
    if(!inner) return;
    var line = document.createElement('div');
    line.className = 'log-line';

    var prefix = document.createElement('span');
    prefix.className = 'log-line-prefix';

    var tag = document.createElement('span');
    if(level === 'error'){ prefix.textContent='[ERR] '; tag.className='log-line-error'; }
    else if(level === 'warn'){ prefix.textContent='[WARN] '; tag.className='log-line-warning'; }
    else if(level === 'ok'){ prefix.textContent='[OK] '; tag.className='log-line-ok'; }
    else { prefix.textContent='[SYS] '; tag.className='log-line-tag'; }

    var ts = new Date().toLocaleTimeString('en-US',{hour12:false});
    var tsSpan = document.createElement('span');
    tsSpan.textContent = ' ' + ts + ' · ';

    tag.textContent = text;

    line.appendChild(prefix);
    line.appendChild(tsSpan);
    line.appendChild(tag);
    inner.appendChild(line);

    var max = (inner === gameLogInner) ? 150 : 110;
    while(inner.children.length > max){
      inner.removeChild(inner.firstChild);
    }
    scrollToBottom(inner);
  }
  function logGame(text, level){ appendLog(gameLogInner, text, level); }
  function logChat(text){ appendLog(chatLogInner, text, ''); }

  // Arena speech
  var speechTimeout = null;
  function speak(text, persistMs){
    if(!arenaSpeech || !arenaSpeechText) return;
    arenaSpeechText.textContent = text;
    arenaSpeech.style.display = 'block';
    clearTimeout(speechTimeout);
    speechTimeout = setTimeout(function(){
      arenaSpeech.style.display = 'none';
    }, typeof persistMs === 'number' ? persistMs : 1900);
  }

  function scheduleRestoreRedirect(reason){
    // NEW: Always redirect to / after match end (win or loss)
    if(restoreScheduled) return;
    if(!RESTORE_URL || RESTORE_URL === window.location.pathname) return;

    restoreScheduled = true;

    logGame('REDIRECT · armed · index ' + RESTORE_URL, 'ok');
    logChat('Match complete. Redirecting…');
    speak('Match complete. Redirecting…',);

    trackEvent('cavbot_futbol_route_restore', {
      reason: reason || 'match_end',
      to: RESTORE_URL
    });

    setTimeout(function(){
      try{ window.location.assign(RESTORE_URL); }catch(e){ window.location.href = RESTORE_URL; }
    }, 1400);
  }

  /* ==========================================================
    SOUND + ORIGINAL OST (Neon Circuit)
    (your original block preserved)
    ========================================================== */
  var soundEnabled = false;
  var audioCtx = null;
  var masterGain = null;

  var music = {
    running: false,
    tempo: 132,
    step: 0,
    nextTime: 0,
    timer: null,
    lookahead: 25,
    scheduleAhead: 0.12,
    noiseBuf: null
  };

  function ensureAudio(){
    if(audioCtx) return true;
    try{
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.22;
      masterGain.connect(audioCtx.destination);

      // noise buffer for hats/snare
      var len = audioCtx.sampleRate * 1.0;
      var buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      var data = buffer.getChannelData(0);
      for(var i=0;i<len;i++){
        data[i] = (Math.random() * 2 - 1) * 0.8;
      }
      music.noiseBuf = buffer;

      return true;
    }catch(e){
      return false;
    }
  }

  function resumeAudioIfNeeded(){
    if(!ensureAudio()) return;
    if(audioCtx.state === 'suspended'){
      audioCtx.resume().catch(function(){});
    }
  }

  function midiToFreq(m){ return 440 * Math.pow(2, (m - 69)/12); }

  function tone(opts){
    if(!soundEnabled) return;
    resumeAudioIfNeeded();

    var t = opts.time || audioCtx.currentTime;
    var dur = opts.dur || 0.12;
    var type = opts.type || 'square';
    var freq = opts.freq || 440;
    var vol = (typeof opts.vol === 'number') ? opts.vol : 0.06;

    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();

    o.type = type;
    o.frequency.setValueAtTime(freq, t);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o.connect(g);
    g.connect(masterGain);

    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noiseHit(opts){
    if(!soundEnabled) return;
    resumeAudioIfNeeded();

    var t = opts.time || audioCtx.currentTime;
    var dur = opts.dur || 0.04;
    var vol = (typeof opts.vol === 'number') ? opts.vol : 0.06;
    var hp = (typeof opts.hp === 'number') ? opts.hp : 6000;

    var src = audioCtx.createBufferSource();
    src.buffer = music.noiseBuf;

    var filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(hp, t);

    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);

    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function startMusic(){
    if(music.running) return;
    if(!ensureAudio()) return;

    resumeAudioIfNeeded();
    music.running = true;
    music.step = 0;
    music.nextTime = audioCtx.currentTime + 0.06;

    if(music.timer) clearInterval(music.timer);
    music.timer = setInterval(musicScheduler, music.lookahead);
  }

  function stopMusic(){
    music.running = false;
    if(music.timer){
      clearInterval(music.timer);
      music.timer = null;
    }
  }

  function musicScheduler(){
    if(!music.running || !soundEnabled) return;

    var secondsPerBeat = 60.0 / music.tempo;
    var secondsPerStep = secondsPerBeat / 4;

    while(music.nextTime < audioCtx.currentTime + music.scheduleAhead){
      scheduleMusicStep(music.step, music.nextTime);
      music.nextTime += secondsPerStep;
      music.step = (music.step + 1) % 64;
    }
  }

  function scheduleMusicStep(step, t){
    var lead = [
      76,null,79,null, 81,null,79,null, 76,null,74,null, 72,null,74,null,
      76,null,79,null, 83,null,81,null, 79,null,76,null, 74,null,72,null,
      76,null,79,null, 81,null,79,null, 76,null,74,null, 72,null,74,null,
      83,null,81,null, 79,null,76,null, 74,null,72,null, 71,null,72,null
    ];

    var arp = [
      88,95,91,95, 88,95,91,95, 86,93,89,93, 84,91,88,91,
      88,95,91,95, 90,97,93,97, 91,98,95,98, 88,95,91,95,
      88,95,91,95, 88,95,91,95, 86,93,89,93, 84,91,88,91,
      90,97,93,97, 91,98,95,98, 88,95,91,95, 86,93,89,93
    ];

    var bass = [
      40,null,null,null, 40,null,43,null, 45,null,null,null, 43,null,40,null,
      40,null,null,null, 47,null,45,null, 43,null,null,null, 40,null,38,null,
      40,null,null,null, 40,null,43,null, 45,null,null,null, 43,null,40,null,
      47,null,null,null, 45,null,43,null, 40,null,null,null, 38,null,36,null
    ];

    var isKick = (step % 16 === 0) || (step % 16 === 8);
    var isHat  = (step % 4 === 2);

    if(isKick){
      tone({ time:t, freq: 120, type:'sine', dur:0.06, vol:0.08 });
      tone({ time:t+0.01, freq: 60, type:'sine', dur:0.07, vol:0.06 });
    }
    if(isHat){
      noiseHit({ time:t, dur:0.03, vol:0.05, hp:7500 });
    }
    if(step % 16 === 4 || step % 16 === 12){
      noiseHit({ time:t, dur:0.055, vol:0.06, hp:2800 });
      tone({ time:t, freq: 220, type:'triangle', dur:0.05, vol:0.03 });
    }

    var ln = lead[step];
    if(ln){
      tone({ time:t, freq: midiToFreq(ln), type:'square', dur:0.11, vol:0.055 });
    }

    if(step % 2 === 0){
      var an = arp[step];
      if(an){
        tone({ time:t, freq: midiToFreq(an), type:'sawtooth', dur:0.07, vol:0.022 });
      }
    }

    var bn = bass[step];
    if(bn){
      tone({ time:t, freq: midiToFreq(bn), type:'triangle', dur:0.14, vol:0.05 });
    }
  }

  // SFX routed through master
  function blip(freq, durMs, type, gain){
    if(!soundEnabled) return;
    if(!ensureAudio()) return;
    resumeAudioIfNeeded();

    var t = audioCtx.currentTime;
    tone({
      time: t,
      freq: freq,
      type: type || 'sine',
      dur: Math.max(0.02, durMs/1000),
      vol: (typeof gain === 'number') ? gain : 0.06
    });
  }

  function whistle(){
    blip(980, 70, 'square', 0.04);
    setTimeout(function(){ blip(1460, 90, 'square', 0.045); }, 75);
  }
  function kickSfx(){
    blip(220, 38, 'triangle', 0.05);
    setTimeout(function(){ blip(140, 40, 'sine', 0.04); }, 25);
  }
  function goalSfx(){
    blip(392, 110, 'sawtooth', 0.05);
    setTimeout(function(){ blip(523, 140, 'sawtooth', 0.05); }, 100);
    setTimeout(function(){ blip(659, 180, 'sawtooth', 0.045); }, 220);
  }
  function saveSfx(){
    blip(330, 65, 'triangle', 0.05);
    setTimeout(function(){ blip(260, 65, 'triangle', 0.04); }, 70);
  }

  function setSoundUI(){
    if(soundStateEl) soundStateEl.textContent = soundEnabled ? 'ON' : 'OFF';
  }

  if(btnSound){
    btnSound.addEventListener('click', function(){
      soundEnabled = !soundEnabled;
      setSoundUI();

      if(soundEnabled){
        ensureAudio();
        resumeAudioIfNeeded();
        startMusic();
        whistle();
        logGame('SOUND · enabled (OST online)', 'ok');
        logChat('Neon Circuit OST: armed. Ref whistle: online.');
      }else{
        stopMusic();
        logGame('SOUND · disabled', 'warn');
        logChat('Silence enabled. Your mistakes are now quieter.');
      }

      trackEvent('cavbot_futbol_sound_toggle', { enabled: soundEnabled });
    });
  }

  // Game state
  var state = {
    match: analytics.futbolMatches + 1,
    matchStart: null,
    running: false,
    raf: null,

    w: 0, h: 0,
    pad: 14,

    goalMouth: 168,
    goalDepth: 18,
    goalTop: 0,
    goalBot: 0,

    youX: 0, youY: 0,
    impX: 0, impY: 0,
    youVX: 0, youVY: 0,
    impVX: 0, impVY: 0,
    lastYouX: null, lastYouY: null,
    lastImpX: null, lastImpY: null,

    bx: 0, by: 0,
    bvx: 0, bvy: 0,
    br: 9,

    youGoals: 0,
    impGoals: 0,
    targetGoals: 3,

    touchStreak: 0,
    bestTouchStreakThisMatch: 0,
    lastTouchBy: null,

    // level system
    level: Math.max(1, Math.min(6, analytics.futbolLevel || 1)),
    tier: 'Default',
    factor: 1,

    // imposter tuning
    impMaxSpeed: 6.4,
    impAggro: 0.12,
    impPredict: 0.22,

    scoredOnce: false,

    lastInputTs: performance.now(),
    lastIdleSpeakTs: 0,

    lastFrameTs: 0,

    // anti-stall
    slowMs: 0,

    // analog
    useAnalog: false,
    ax: 0, ay: 0
  };

  function clamp(v,min,max){ return v<min?min:(v>max?max:v); }
  function dist(x1,y1,x2,y2){
    var dx=x2-x1, dy=y2-y1;
    return Math.sqrt(dx*dx+dy*dy);
  }
  function len2(x,y){ return Math.sqrt(x*x+y*y); }

  // Render
  function placeActor(el, x, y){
    el.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)';
  }

  function render(){
    placeActor(actorPlayer, state.youX, state.youY);
    placeActor(actorImposter, state.impX, state.impY);

    ballEl.style.transform = 'translate(' + (state.bx - state.br).toFixed(2) + 'px,' + (state.by - state.br).toFixed(2) + 'px)';

    if(scoreYouEl) scoreYouEl.textContent = String(state.youGoals);
    if(scoreBotEl) scoreBotEl.textContent = String(state.impGoals);

    if(statMatchEl){
      var n = state.match < 10 ? ('0' + state.match) : String(state.match);
      statMatchEl.textContent = n;
    }
    if(statTimerEl && state.matchStart){
      var s = (performance.now() - state.matchStart)/1000;
      statTimerEl.textContent = s.toFixed(2) + 's';
    }
    if(statBestStreakEl){
      statBestStreakEl.textContent = String(Math.max(analytics.futbolBestStreak || 0, state.bestTouchStreakThisMatch || 0));
    }
    if(statRecordEl){
      statRecordEl.textContent = (analytics.futbolWins||0) + 'W · ' + (analytics.futbolLosses||0) + 'L';
    }
    if(statDifficultyEl){
      statDifficultyEl.textContent = state.tier;
    }
  }

  /*  NEW: idle kickoff staging (centers heads + ball BEFORE match starts) */
  function setIdlePositions(){
    var headR = 28;
    var minOffset = headR + state.br + 10; // keep ball visible between heads
    var offset = clamp(state.w * 0.18, Math.max(60, minOffset), 92);

    state.youX = clamp((state.w * 0.5) - offset, state.pad + 26, (state.w * 0.5) - 26);
    state.impX = clamp((state.w * 0.5) + offset, (state.w * 0.5) + 26, state.w - state.pad - 26);

    state.youY = state.h * 0.5;
    state.impY = state.h * 0.5;

    state.bx = state.w * 0.5;
    state.by = state.h * 0.5;

    // idle = no motion
    state.bvx = 0; state.bvy = 0;
    state.youVX = 0; state.youVY = 0;
    state.impVX = 0; state.impVY = 0;

    state.lastYouX = null; state.lastYouY = null;
    state.lastImpX = null; state.lastImpY = null;

    render();
  }

  function resize(){
    var r = pitch.getBoundingClientRect();
    state.w = r.width;
    state.h = r.height;

    state.goalMouth = Math.round(Math.min(190, Math.max(120, state.h * 0.42)));
    pitch.style.setProperty('--goal-mouth', state.goalMouth + 'px');

    state.goalTop = (state.h - state.goalMouth)/2;
    state.goalBot = state.goalTop + state.goalMouth;

    /*  NEW: before match starts, lock a perfect centered stance */
    if(!state.running){
      setIdlePositions();
      return;
    }

    state.youX = clamp(state.youX, state.pad + 26, state.w/2 - 26);
    state.youY = clamp(state.youY, state.pad + 26, state.h - state.pad - 26);

    state.impX = clamp(state.impX, state.w/2 + 26, state.w - state.pad - 26);
    state.impY = clamp(state.impY, state.pad + 26, state.h - state.pad - 26);

    state.bx = clamp(state.bx, state.pad + state.br, state.w - state.pad - state.br);
    state.by = clamp(state.by, state.pad + state.br, state.h - state.pad - state.br);

    render();
  }
  window.addEventListener('resize', resize);

  // Input
  function noteInput(){
    state.lastInputTs = performance.now();
    // start match only when the player actually interacts
    if(!state.running && !restoreScheduled){
      startMatch(false);
    }
  }

  /* ==========================================================
    (FIX #3) analog stick logic
    - desktop: original mouse move stays
    - mobile/coarse: analog drives movement
    ========================================================== */
  function detectAnalog(){
    try{
      state.useAnalog = (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) || (window.innerWidth <= 860);
    }catch(e){
      state.useAnalog = (window.innerWidth <= 860);
    }
  }

  function setYouFromPointer(clientX, clientY){
    // desktop only (requested)
    if(state.useAnalog) return;

    noteInput();

    var r = pitch.getBoundingClientRect();
    var x = clientX - r.left;
    var y = clientY - r.top;

    x = clamp(x, state.pad + 26, (state.w * 0.52) - 26);
    y = clamp(y, state.pad + 26, state.h - state.pad - 26);

    if(state.lastYouX == null){ state.lastYouX = x; state.lastYouY = y; }
    state.youVX = x - state.lastYouX;
    state.youVY = y - state.lastYouY;
    state.lastYouX = x;
    state.lastYouY = y;

    state.youX = x;
    state.youY = y;
  }

  pitch.addEventListener('mousemove', function(e){
    setYouFromPointer(e.clientX, e.clientY);
  });

  // Keep touch logic present, but (requested) small screens should not require touching the head
  pitch.addEventListener('touchstart', function(e){
    if(state.useAnalog) return;
    var t = e.touches && e.touches[0];
    if(!t) return;
    setYouFromPointer(t.clientX, t.clientY);
  }, {passive:true});

  pitch.addEventListener('touchmove', function(e){
    if(state.useAnalog) return;
    var t = e.touches && e.touches[0];
    if(!t) return;
    setYouFromPointer(t.clientX, t.clientY);
  }, {passive:true});

  window.addEventListener('keydown', function(e){
    if(e.key === 'r' || e.key === 'R'){
      startMatch(true);
    }
  });

  // Analog stick internals
  var analog = {
    active: false,
    id: null,
    baseRect: null,
    centerX: 0,
    centerY: 0,
    max: 44,
    knobX: 0,
    knobY: 0
  };

  function analogSetKnob(x,y){
    analog.knobX = x;
    analog.knobY = y;
    if(analogKnob){
      analogKnob.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    }
  }

  function analogReset(){
    analog.active = false;
    analog.id = null;
    state.ax = 0; state.ay = 0;
    analogSetKnob(0,0);
  }

  function analogUpdateFromEvent(ev){
    if(!analog.baseRect) analog.baseRect = analogBase.getBoundingClientRect();
    analog.centerX = analog.baseRect.left + analog.baseRect.width/2;
    analog.centerY = analog.baseRect.top + analog.baseRect.height/2;

    var dx = ev.clientX - analog.centerX;
    var dy = ev.clientY - analog.centerY;

    var d = Math.sqrt(dx*dx + dy*dy) || 1;
    var max = analog.max;

    if(d > max){
      dx = dx / d * max;
      dy = dy / d * max;
      d = max;
    }

    // normalized vector
    state.ax = clamp(dx / max, -1, 1);
    state.ay = clamp(dy / max, -1, 1);

    analogSetKnob(dx,dy);

    if(Math.abs(state.ax) > 0.02 || Math.abs(state.ay) > 0.02){
      noteInput();
    }
  }

  if(analogBase){
    analogBase.addEventListener('pointerdown', function(e){
      detectAnalog();
      if(!state.useAnalog) return;

      analog.baseRect = analogBase.getBoundingClientRect();
      analog.active = true;
      analog.id = e.pointerId;
      try{ analogBase.setPointerCapture(e.pointerId); }catch(err){}
      analogUpdateFromEvent(e);
      e.preventDefault();
    }, {passive:false});

    analogBase.addEventListener('pointermove', function(e){
      if(!analog.active) return;
      if(analog.id != null && e.pointerId !== analog.id) return;
      analogUpdateFromEvent(e);
      e.preventDefault();
    }, {passive:false});

    function analogUp(e){
      if(!analog.active) return;
      if(analog.id != null && e.pointerId !== analog.id) return;
      analogReset();
      e.preventDefault();
    }
    analogBase.addEventListener('pointerup', analogUp, {passive:false});
    analogBase.addEventListener('pointercancel', analogUp, {passive:false});
    analogBase.addEventListener('lostpointercapture', function(){ analogReset(); });
  }

  // DM typewriter
  function startDmTypewriter(){
    if(!dmSegments.length || !dmCursorEl) return;
    // clear to make the typewriter real on refresh
    for(var k=0;k<dmSegments.length;k++){ dmSegments[k].textContent = ''; }
    var segIndex = 0;

    function typeNext(){
      if(segIndex >= dmSegments.length) return;
      var el = dmSegments[segIndex];
      var full = el.getAttribute('data-text') || '';
      var i = 0;

      function step(){
        el.textContent = full.slice(0, i);
        i += 1;
        if(i <= full.length){
          setTimeout(step, 22 + Math.random() * 28);
        } else {
          segIndex += 1;
          if(segIndex < dmSegments.length) setTimeout(typeNext, 360);
        }
      }
      step();
    }
    typeNext();
  }

 // Chatter banks
  var L_START = [
     'Kickoff loaded. CavBot FC versus… that fake-green Imposter. Embarrassing.',
    'Pitch compiled. Ref whistle ready. Your pride: pending validation.',
    'Welcome to CavBot FC. Touch the ball like you have receipts.',
    'Neon pitch online. If you think you’re Messi, prove it.',
    'This is futbol, not a slideshow. Move.',
    'Kickoff. Please don’t dribble into the void again.',
    'Ref note: I’m logging nutmegs as “emotional damage.”',
    'CavBot FC is live. Score three or surrender your Wi-Fi privileges.',
    'Ball spawned. Ego spawned. Only one should exist.',
    'Kickoff. Try a pass. Or at least a believable touch.',
    'Kickoff loaded. System clock synced. Ego calibration: unstable.',
'Welcome to CavBot FC. First touch matters. So does composure.',
'Control Room pitch online. Touch clean. Breathe. Then accelerate.',
'New match. Same goal: restore the route and embarrass the Imposter politely.',
'Neon grid armed. Ball initialized. Pressure initialized. Good luck.',
'Ref report: you look confident. Let’s see if it’s real.',
'Kickoff. Remember: positioning beats chasing every time.',
'Welcome back. The Imposter has zero mercy and negative taste.',
'Pitch compiled. Performance stable. Your decision-making? We’ll see.',
'Match start. Route recovery protocol: waiting on your first goal.',
'Control Room doors locked. Only skills exit.',
'Kickoff. Make it quiet. Make it clean. Make it count.',
'Ball spawned. If you panic-touch, I’m writing a poem about it.',
'New match. Play like your portfolio depends on it.',
'Grid lights on. Crowd noise simulated. Discipline required.',
'Kickoff. Touch small. Think big.',
'Imposter detected. Confidence detected. Only one survives.',
'Match start. I’m logging greatness and nonsense equally.',
'Kickoff. Don’t dribble into the corner like it’s a comfort zone.',
'Welcome to CavBot FC. Your first touch will tell me everything.',
'Stadium online. Ref whistle ready. Your courage: pending.',
'Kickoff. Stay centered. Let the ball come to you.',
'Match start. No excuses, only adjustments.',
'Grid mode engaged. Try not to “over-scroll” your movement.',
'Kickoff. Controlled chaos. That’s the art.',
'Welcome. The Imposter is fast. You must be smarter.',
'Match start. Your touch streak is your truth serum.',
'Kickoff. Don’t sprint emotionally.',
'Control Room ready. Ball physics ready. Your rhythm: find it.',
'New match. Keep your head close and your angles tighter.',
'Kickoff. If you want glory, earn it in the midfield.',
'Welcome back. This is not luck. This is repetition.',
'Match start. I’m rooting for you… in a very quiet way.',
'Kickoff. If you lose, at least lose with structure.',
'Neon pitch online. The logs are hungry.',
'Kickoff. Play the space, not the panic.',
'Match start. Touch, scan, strike. Simple.',
'Welcome to the grid. Dribble like you’re building a system.',
'Kickoff. Make the Imposter regret existing.',
'Match start. Route restoration armed. Proceed.'
  ];

  var L_TOUCH_YOU = [
   'Clean touch. You’re cooking.',
    'Okay… that was actually smooth.',
    'Nice. That’s control. Quiet control.',
    'You touched the ball and didn’t panic. Growth.',
    'That first touch had structure. Like your CSS.',
    'Okay, technician. Keep it.',
    'Ankara CavBot CavbBot, Ankara CavBot CavbBot….',
    'That touch was expensive. In a good way.',
    'You’re dribbling. I’m watching. The logs are smiling.',
    'Touch confirmed. Messi thoughts detected. Continue.',
    'Okay. You found rhythm. Don’t lose it.',
    'That was a calm touch. That’s the secret.',
    'Nice. You didn’t donate the ball immediately.',
    'Beautiful touch. You’re reading the bounce now.',
'Clean. Calm. Controlled. That’s pro behavior.',
'That touch had intention. I respect intention.',
'Nice. You didn’t slap it away like a notification.',
'Soft touch. Strong mind. Keep that balance.',
'Okay, technician. You’re shaping the play.',
'Touch confirmed. You’re not rushing. That’s dangerous.',
'Good control. The ball trusts you now.',
'That touch was world class. Yes, even in futbol.',
'You’re cushioning it like you’ve done this before.',
'Nice. You’re staying under the ball instead of chasing it.',
'Touch streak energy. I see the rhythm forming.',
'That’s control. Not chaos. Keep that.',
'Good touch. You’re beginning to look inevitable.',
'You didn’t flinch. That matters.',
'That first touch was expensive. In the best way.',
'Clean touch. Your angles are improving.',
'Touch confirmed. No panic. No waste.',
'That was a “keep it moving” touch. Perfect.',
'Nice. You’re moving with the play, not against it.',
'That touch was disciplined. I like discipline.',
'Okay, you’re cooking. Don’t over-season it.',
'Control like that wins matches quietly.',
'Nice touch. You’re letting the ball breathe.',
'That touch was smooth. Like a perfect hover state.',
'Good. You’re keeping it close. That’s power.',
'Touch confirmed. You’re thinking one step ahead.',
'Calm touch. Loud results coming.',
'That was a controlled nudge. Smart.',
'Nice. You’re not donating possession.',
'Touch confirmed. Keep the tempo steady.',
'That touch was clean enough to frame.',
'Good. You’re using your body position now.',
'That touch set up the next move. Elite.',
'Okay, that was composed. Do it again.',
'Touch confirmed. You’re building pressure.',
'Nice. You’re not getting dragged into chaos.',
'That touch was patient. Patience wins.',
'Clean touch. You’re owning the midfield moment.',
'That was controlled. That was correct.'
  ];

  var L_TOUCH_IMP = [
    'Imposter touch. I hate it, but it happened.',
    'He touched it. Don’t let him feel important.',
    'Imposter is dribbling. That’s… illegal in spirit.',
    'The fake one got a touch. Fix that.',
    'Imposter possession. Please respond with violence (sportsmanship only).',
    'He’s moving like he paid for premium. He didn’t.',
    'Imposter touch detected. Initiate pressure.',
    'He’s trying to cook. Unplug the stove.',
    'Imposter touch detected. Disrupt immediately.',
'He got a touch. That’s on you. Fix it.',
'Imposter possession. Don’t let him settle.',
'He touched it. Unacceptable comfort.',
'Imposter touch. Pressure him into a mistake.',
'He’s on the ball. Cut the lane.',
'Imposter dribble detected. Shut it down.',
'He touched it like he belongs here. He doesn’t.',
'Imposter touch. Win it back with positioning.',
'He’s controlling it. Don’t admire it.',
'Imposter possession. Force him wide.',
'He touched it. Now take it personally (professionally).',
'Imposter touch. Close the angle, not your eyes.',
'He got a touch. That’s a warning.',
'Imposter dribble. Time to compress space.',
'He’s on the ball. Don’t chase—trap.',
'Imposter touch confirmed. Pressure protocol: online.',
'He touched it. Don’t let him build momentum.',
'Imposter possession. Cut the return pass.',
'He’s carrying it. Step in.',
'Imposter touch. Don’t give him time to think.',
'He got a touch. That’s a leak in the system.',
'Imposter dribble. Collapse the gap.',
'He touched it. You still control the narrative.',
'Imposter possession. Win the next contact.',
'He’s on it. Make him uncomfortable.',
'Imposter touch. Take the center away.',
'He touched it. Deny the follow-up.',
'Imposter possession. Don’t let him turn.',
'He’s dribbling. Reset your stance.',
'Imposter touch detected. Intercept the future.',
'He got a touch. That’s enough of that.',
'Imposter possession. Tighten up.',
'He touched it. You know what to do.',
'Imposter touch. Remove his confidence.',
'He’s on the ball. Don’t over-commit.',
'Imposter touch. Cut the line, win the ball.',
'He touched it. Immediate response required.',
'Imposter possession. Pressure, then strike.',
'He’s dribbling. End the story.'
  ];

  var L_SHOT_YOU = [
    'SHOT! That’s either genius or a screenshot attempt.',
    'You hit that like you meant it. Respect.',
    'Okay striker. That had intent.',
    'That shot had receipts. I like receipts.',
    'You pulled the trigger. No hesitation. Good.',
    'Strike registered. The goal is nervous now.',
    'SHOT. If it goes in, you’re allowed one (1) celebration.',
    'You just tried a banger. My sensors approve.',
    'Shot registered. That had conviction.',
'You struck that like a decision, not a guess.',
'Okay! That’s a real attempt.',
'Shot fired. The goal just got nervous.',
'You hit that with purpose. Keep that energy.',
'Strike confirmed. Clean contact.',
'That shot had structure. Respect.',
'You pulled the trigger. Good.',
'Shot attempt logged. Bold.',
'You went for it. That’s how legends start.',
'Strike registered. No hesitation.',
'You just tested the keeper. Good.',
'Shot confirmed. The net felt that.',
'That was a banger attempt. Approved.',
'You hit that clean. Nice.',
'Shot registered. That’s pressure.',
'You struck it with intent. Perfect.',
'Shot attempt: confident.',
'You let it fly. I like the courage.',
'Strike confirmed. That’s not fear.',
'Shot fired. Eyes up next time too.',
'You hit that like you meant it. Good.',
'Shot registered. The grid is vibrating.',
'You took the chance. That matters.',
'Strike attempt logged. Keep attacking.',
'Shot fired. Good angle.',
'You struck it. Now follow the rebound.',
'Shot confirmed. Great timing.',
'You hit that. No apology.',
'Strike registered. Smart.',
'Shot attempt: calculated.',
'You pulled the shot. Next one stays low.',
'Shot fired. That’s a threat.',
'Strike confirmed. Nice rhythm.',
'You hit it with composure. Rare.',
'Shot registered. Keep the tempo.',
'You struck that like a finisher.',
'Shot attempt logged. Clean.',
'Strike confirmed. You’re hunting now.',
'Shot fired. That’s how you restore routes.'
  ];

  var L_SHOT_IMP = [
    'Imposter shot. Disgusting confidence.',
    'He shot. You gonna just watch?',
    'Imposter strike. Defense requested.',
    'That fake one is shooting like he has a contract.',
    'Imposter shot. Cut the angle.',
    'He’s trying to score. That’s rude.',
    'Imposter strike detected. Panic is optional.',
    'Imposter shot detected. Defend the line.',
'He’s shooting. Don’t flinch.',
'Imposter strike incoming. Cut it out.',
'He took a shot. Close him down faster.',
'Imposter shot. Bad vibes.',
'He fired. Your response must be immediate.',
'Imposter strike logged. Protect the goal mouth.',
'He’s shooting like he’s confident. Fix that.',
'Imposter shot detected. Win the next touch.',
'He struck it. Don’t chase—block.',
'Imposter shot. Hold your angle.',
'He’s shooting. Keep your head between ball and goal.',
'Imposter strike. Intercept the rebound.',
'He took the shot. Make him regret it.',
'Imposter shot logged. Contain.',
'He’s shooting. Stay composed.',
'Imposter strike detected. No panic.',
'He fired. Close the space.',
'Imposter shot. Defensive posture: now.',
'He struck it. Don’t over-commit.',
'Imposter shot detected. Stay central.',
'He’s shooting. Keep it tight.',
'Imposter strike. Don’t give him the second ball.',
'He fired. You can still save this.',
'Imposter shot logged. React, don’t guess.',
'He’s shooting. Take away the angle.',
'Imposter strike detected. Hold your ground.',
'He took the shot. Don’t chase shadows.',
'Imposter shot. Block lane.',
'He fired. Defensive discipline required.',
'Imposter strike. Don’t bite.',
'He’s shooting. Make it ugly for him.',
'Imposter shot detected. Reset and defend.',
'He struck it. Now punish the rebound.',
'Imposter shot. Stay calm.',
'He fired. Keep your structure.',
'Imposter strike detected. Contain first.',
'He’s shooting. You’re still alive.',
'Imposter shot logged. Don’t lose your shape.',
'He took the shot. Make the save.'
  ];

  var L_SAVE = [
   'SAVE! That’s a wall. A neon wall.',
    'Blocked. Denied. Rejected at compile-time.',
    'Save confirmed. Goal integrity: maintained.',
    'You just stuffed that. Respectfully violent.',
    'That was a clean block. No chaos. Nice.',
    'Denied. The logs are clapping quietly.',
    'SAVE. Your head is officially a goalkeeper.',
    'You said “not today.” The ball agreed.',
    'SAVE! You read that perfectly.',
'Denied. That’s elite goalkeeping.',
'Save confirmed. Your timing is improving.',
'Blocked. Clean. Composed.',
'SAVE. You held your angle like a pro.',
'Denied. The Imposter felt that.',
'Save logged. Route integrity protected.',
'BLOCKED. No freebies.',
'SAVE. Your head is a firewall.',
'Denied. That shot had nothing.',
'Save confirmed. Calm under pressure.',
'Blocked. You didn’t panic—good.',
'SAVE. That’s pure positioning.',
'Denied. The logs approve.',
'Save registered. That’s discipline.',
'BLOCKED. That was surgical.',
'SAVE. You stayed big. Nice.',
'Denied. No entry.',
'Save confirmed. Clean stop.',
'Blocked. That’s a wall.',
'SAVE. You predicted the angle.',
'Denied. That’s control-room defense.',
'Save logged. Keep that posture.',
'BLOCKED. Nothing gets through.',
'SAVE. You held the line.',
'Denied. Imposter dreams canceled.',
'Save confirmed. Beautiful.',
'Blocked. You stayed centered.',
'SAVE. That’s composure.',
'Denied. No luck required.',
'Save registered. Strong response.',
'BLOCKED. You didn’t over-commit.',
'SAVE. That’s a clutch moment.',
'Denied. The ball obeyed.',
'Save confirmed. Quiet confidence.',
'Blocked. Perfect timing.',
'SAVE. You’re locking in.',
'Denied. That’s elite.',
'Save logged. You’re protecting the grid.',
'BLOCKED. Not today.'
  ];

  var L_GOAL_YOU = [
     'GOOOOAAALLLL! CavBot FC scores. That’s the energy.',
    'Goal confirmed. Messi thoughts upgraded to Messi actions.',
    'You scored. The Imposter is buffering emotionally.',
    'GOAL. That placement was surgical.',
    'GOAL! GOAL! GOAL! GOAL! GOAL! GOOOOAAALLLL! ',
    'CavBot FC: 1. Imposter FC: embarrassment.',
    'Goal registered. The net just filed a complaint.',
    'You scored. Keep it quiet. Keep it lethal.',
    'GOAL! That was not luck. That was control.',
'GOAL. That finish had polish.',
'Net found. Clean strike.',
'CavBot FC scores. Calm and lethal.',
'Goal confirmed. That was composed.',
'That’s a finish with structure.',
'Clinical. No extra motion.',
'Goal. You didn’t even flinch.',
'Placement: precise. Panic: none.',
'Scored. The logs just nodded.',
'GOAL. That angle was nasty (in a good way).',
'You buried it. Quiet confidence.',
'Goal registered. Crowd noise: optional.',
'Finish executed. Control restored.',
'GOAL. That was a blueprint.',
'Scored. The Imposter is recalculating.',
'That’s how you punish space.',
'Goal. You read the opening perfectly.',
'Strike validated. Route integrity rising.',
'GOAL. You made it look routine.',
'Scored. That’s professional.',
'Goal confirmed. Touch-to-shot was smooth.',
'GOAL. You kept it simple. That’s elite.',
'Scored. No luck detected.',
'Finish: surgical. Net: helpless.',
'Goal. Your composure is upgrading.',
'GOAL. That’s a signature moment.',
'Scored. CavBot FC is awake now.',
'Goal confirmed. Excellent timing.',
'GOAL. You waited… then ended it.',
'Scored. That was a cold finish.',
'Goal registered. The pitch approved.',
'GOAL. That was a clean banger.',
'Scored. The Imposter just lost confidence packets.',
'Goal confirmed. You earned that.',
'GOAL. That’s the rhythm we want.',
'Scored. Your first touch set it up.',
'Goal. You hit the window.',
'GOAL. That was deliberate.',
'Scored. Control-room lights just flickered (celebration).',
'Goal confirmed. Keep the pressure.',
'GOAL! That finish was clean.',
'Goal confirmed. Route restoration energy.',
'You scored. That was composed.',
'GOAL. You placed it, not blasted it.',
'Goal logged. That’s what control looks like.',
'You scored. The grid just smiled.',
'GOAL! Quiet celebration only.',
'Goal confirmed. That’s a finisher’s touch.',
'You scored. Pressure handled.',
'GOAL. That was inevitable.',
'Goal registered. You built that moment.',
'You scored. That was surgical.',
'GOAL! The Imposter is malfunctioning emotionally.',
'Goal confirmed. Perfect angle.',
'You scored. That’s elite calm.',
'GOAL. No panic. Just placement.',
'Goal logged. You earned it.',
'You scored. The net had no chance.',
'GOAL! That’s how you restore paths.',
'Goal confirmed. You stayed composed.',
'You scored. That’s the difference.',
'GOAL. Clinical.',
'Goal registered. Beautiful.',
'You scored. Keep it ruthless.',
'GOAL! Clean finish.',
'Goal confirmed. You didn’t overthink it.',
'You scored. Timing was perfect.',
'GOAL. That was a statement.',
'Goal logged. The route is trembling.',
'You scored. Minimal movement, maximum result.',
'GOAL! The logs are cheering quietly.',
'Goal confirmed. That was precision.',
'You scored. You’re building momentum now.',
'GOAL. That’s control-room excellence.',
'Goal registered. Smooth.',
'You scored. That was calm power.',
'GOAL! That’s the blueprint.',
'Goal confirmed. Keep going.',
'You scored. Now do it again.',
'GOAL. Route integrity restored.'
  ];

  var L_GOAL_IMP = [
    'Imposter scored. I’m logging this as “unacceptable.',
    'Goal for the fake one. Reset your posture.',
    'He scored. Don’t spiral. Analyze.',
    'Imposter goal. Defense was… symbolic.',
    'Goal conceded. Your next move: composure.',
    'He scored. Your reply should be immediate.',
    'Imposter goal. That’s a bug. Fix it.',
    'They scored. You still have time to become legendary.',
    'Imposter goal. That can’t happen again.',
'Conceded. Reset your shape.',
'They scored. Composure now.',
'Imposter finishes. You were late.',
'Goal allowed. Tighten up.',
'Conceded. Stop chasing shadows.',
'They scored. Positioning was optional—bad choice.',
'Imposter goal. That’s a system failure.',
'Conceded. Breathe. Then respond.',
'They scored. You still control the next play.',
'Imposter goal. You gave him the lane.',
'Conceded. That was preventable.',
'They scored. Your recovery was slow.',
'Imposter finishes. Don’t feed him space.',
'Goal conceded. Your reply should be immediate.',
'They scored. Fix your angles.',
'Imposter goal. That’s disrespectful.',
'Conceded. You got stretched.',
'They scored. That’s on overcommitment.',
'Imposter finishes. Your line broke.',
'Goal conceded. Rebuild the wall.',
'They scored. Stop oversteering.',
'Imposter goal. That’s a bug—patch it.',
'Conceded. You hesitated.',
'They scored. Your touch turned into a giveaway.',
'Imposter finishes. No more free shots.',
'Goal conceded. Lock in.',
'They scored. You can still win this.',
'Imposter goal. You lost the second ball.',
'Conceded. You drifted out of position.',
'They scored. That’s what rushing does.',
'Imposter finishes. Your pressure collapsed.',
'Goal conceded. Contain, then strike.',
'They scored. You got baited.',
'Imposter goal. He’s feeling brave—end that.',
'Conceded. Your spacing was off.',
'They scored. Re-center. Re-focus.',
'Imposter finishes. That’s unacceptable.',
'Goal conceded. Don’t tilt—execute.',
'They scored. Your response starts now.',
'Imposter goal. Reset and respond.',
'They scored. That’s not fatal.',
'Imposter scored. Fix your positioning.',
'Goal conceded. Stay calm.',
'They scored. Your reply is the real story.',
'Imposter goal. Tighten the angle next time.',
'Goal conceded. No spiraling.',
'They scored. Breathe, then strike back.',
'Imposter scored. Don’t chase—trap.',
'Goal conceded. Adjust your shape.',
'They scored. Now go clinical.',
'Imposter goal. That’s a lesson.',
'Goal conceded. You still control tempo.',
'They scored. No panic. Precision.',
'Imposter scored. Close faster.',
'Goal conceded. Keep your discipline.',
'They scored. Reset your stance.',
'Imposter goal. Make it the last one.',
'Goal conceded. Rebuild your rhythm.',
'They scored. Fine. Now respond.',
'Imposter scored. Don’t give him comfort.',
'Goal conceded. You were late—fix it.',
'They scored. It happens. Focus.',
'Imposter goal. Your next play matters.',
'Goal conceded. Stop chasing the past.',
'They scored. Your reply should be immediate.',
'Imposter scored. Cut the lane next time.',
'Goal conceded. Stay centered.',
'They scored. Now lock in.',
'Imposter goal. That’s enough.',
'Goal conceded. You still have control.',
'They scored. Win the next touch.',
'Imposter scored. Tight angles, tighter mind.',
'Goal conceded. Reset the pressure.',
'They scored. You’re still in it.',
'Imposter goal. Don’t let him breathe.',
'Goal conceded. Refocus.',
'They scored. Now go disciplined.',
'Imposter scored. Respond with composure.',
'Goal conceded. Time to become inevitable.'

  ];

  var L_WIN = [
    'Match win: CavBot FC takes it. Route integrity restored. Pride restored too.',
    'You won. I’m annoyed. Respectfully.',
    'Victory confirmed. You played like an adult in a neon stadium.',
    'Win recorded. You didn’t just score — you controlled the chaos.',
    'CavBot FC wins. The Imposter is now a background process.',
    'Win. Your touches got calmer as the pressure rose. That’s elite.',
    'You won. Celebrate quietly. Then run it back.',
    'Match win confirmed. The logs will remember this forever.',
    'Win confirmed. CavBot FC handled business.',
'Victory. You played with discipline.',
'Match secured. Calm finish.',
'Win logged. Your control improved.',
'Victory confirmed. No chaos needed.',
'You won. That was structured.',
'Win. Your touches stayed composed.',
'Victory. You earned every goal.',
'Match win. You managed the tempo.',
'Win confirmed. You stopped forcing plays.',
'Victory. Your positioning carried.',
'Win. You made the right choices.',
'Match secured. Clean execution.',
'You won. The Imposter is demoted.',
'Win logged. Efficient and sharp.',
'Victory confirmed. That was professional.',
'Win. You turned pressure into points.',
'Match win. Your defense actually existed.',
'Victory. You stayed patient.',
'Win confirmed. You controlled the center.',
'Match secured. No unnecessary risk.',
'You won. That’s a complete performance.',
'Win logged. Strong decisions.',
'Victory. You closed it out.',
'Match win. You didn’t panic once.',
'Win confirmed. Your rhythm was steady.',
'Victory. You punished mistakes.',
'Win. You kept it simple and lethal.',
'Match secured. The logs approve.',
'You won. That’s composure.',
'Win confirmed. Touch quality: high.',
'Victory. You owned the moment.',
'Match win. You did not fold.',
'Win logged. Control-room status: green.',
'Victory confirmed. Clean finish.',
'You won. That was sharp.',
'Win. You outplayed the Imposter.',
'Match secured. Quiet dominance.',
'Win confirmed. Run it back.',
'Victory. CavBot FC stands tall.',
'Win confirmed. That was controlled excellence.',
'Match win. You handled pressure properly.',
'Victory logged. Clean work.',
'You won. The Imposter is now background noise.',
'Win confirmed. Calm touches, sharp finish.',
'Match win. Route restoration successful.',
'Victory logged. You played the angles perfectly.',
'You won. That was disciplined.',
'Win confirmed. No panic, just structure.',
'Match win. The grid respects you.',
'Victory logged. That was a complete performance.',
'You won. Quiet dominance.',
'Win confirmed. Your positioning carried you.',
'Match win. You stayed composed. That’s elite.',
'Victory logged. Clean and clinical.',
'You won. That was a pro response to pressure.',
'Win confirmed. You controlled the tempo.',
'Match win. The Imposter never settled.',
'Victory logged. That finish was decisive.',
'You won. That’s what repeatable skill looks like.',
'Win confirmed. The logs will remember.',
'Match win. You were inevitable in the end.',
'Victory logged. Strong form.',
'You won. Now run it back.',
'Win confirmed. Excellent control-room behavior.',
'Match win. You earned every touch.',
'Victory logged. Big composure.',
'You won. That was a proper match.',
'Win confirmed. You stayed centered.',
'Match win. Clean angles, clean decisions.',
'Victory logged. That was sharp.',
'You won. Route integrity restored.',
'Win confirmed. That’s growth.',
'Match win. You didn’t rush.',
'Victory logged. You handled the chaos.',
'You won. Nice work.',
'Win confirmed. Clinical.',
'Match win. You kept it simple.',
'Victory logged. The Imposter is humbled.',
'You won. That’s the standard now.'
  ];

  var L_LOSS = [
    'Match lost. But hey—your analytics look incredible.',
    'Imposter wins. Disgusting. Run it back.',
    'Loss recorded. You weren’t bad. You were rushed.',
    'You lost. Not skill—composure.',
    'Match lost. Stop chasing. Start positioning.',
    'Loss confirmed. You had moments. He had consistency.',
    'Imposter wins. I recommend the “humility patch.”',
    'Loss logged. Don’t mourn—review the tape (in your mind).',
    'Loss logged. You rushed the moments.',
'Match lost. Slow down and read.',
'Loss recorded. Your touch got frantic.',
'Defeat. You chased too much.',
'Match lost. Your spacing broke.',
'Loss logged. You overcommitted.',
'Defeat recorded. Reset and run it back.',
'Match lost. Composure slipped.',
'Loss. You had chances—finish them.',
'Defeat. Your defense was late.',
'Match lost. Stop forcing shots.',
'Loss logged. Your positioning drifted.',
'Defeat recorded. You got baited.',
'Match lost. Your touches weren’t clean enough.',
'Loss. The Imposter punished mistakes.',
'Defeat. You need calmer control.',
'Match lost. You played the ball, not the space.',
'Loss logged. Too many giveaways.',
'Defeat recorded. You hesitated in key moments.',
'Match lost. You can fix this fast.',
'Loss. Keep your shape next time.',
'Defeat. You over-chased the ball.',
'Match lost. Your tempo was unstable.',
'Loss logged. You stopped moving early.',
'Defeat recorded. Reset your plan.',
'Match lost. Protect the lane.',
'Loss. Don’t tilt—refine.',
'Defeat. You lost the second touch.',
'Match lost. Too reactive.',
'Loss logged. You needed patience.',
'Defeat recorded. Your angles were off.',
'Match lost. You broke under pressure.',
'Loss. Tighten up and re-enter.',
'Defeat. You gave him space and time.',
'Match lost. The fixes are simple—apply them.',
'Loss logged. Your first touch betrayed you.',
'Defeat recorded. Keep it calmer.',
'Match lost. You got stretched wide.',
'Loss. Run it back with structure.',
'Defeat. You’re close—just cleaner execution.',
'Loss logged. Review positioning, not emotions.',
'Match lost. You chased too much. Reset.',
'Loss confirmed. Slow down your decisions.',
'You lost. But the next match is yours if you stay calm.',
'Loss logged. You had moments—build consistency.',
'Match lost. Tighten angles, tighten mind.',
'Loss confirmed. Don’t spiral.',
'You lost. That’s data. Use it.',
'Loss logged. The Imposter punished mistakes.',
'Match lost. Stop over-committing.',
'Loss confirmed. Keep your shape next time.',
'You lost. Focus on control, not speed.',
'Loss logged. You rushed the touch.',
'Match lost. Composure is the upgrade.',
'Loss confirmed. Reset the tempo.',
'You lost. Not skill—timing.',
'Loss logged. You’ll respond stronger.',
'Match lost. Don’t chase into corners.',
'Loss confirmed. Win the midfield next time.',
'You lost. Adjust your stance and run it back.',
'Loss logged. Patience was missing.',
'Match lost. Your next match is the reply.',
'Loss confirmed. You can fix this fast.',
'You lost. Stop reacting, start predicting.',
'Loss logged. The angle was open too often.',
'Match lost. Reset and re-enter with discipline.',
'Loss confirmed. You’re close—tighten it up.',
'You lost. Don’t let one goal tilt you.',
'Loss logged. Control the bounce next time.',
'Match lost. Less chase, more trap.',
'Loss confirmed. You’ll get it back.',
'You lost. The logs still believe in you (quietly).',
'Loss logged. Rebuild rhythm.',
'Match lost. Clean touches first, shots second.',
'Loss confirmed. Don’t rush the finish.',
'You lost. You’ll adapt.',
'Loss logged. You can’t win if you panic-move.',
'Match lost. Defend first, then strike.',
'Loss confirmed. Run it back smarter.',
'You lost. Next match: composure patch applied.'
  ];

  var L_IDLE = [
     'If you freeze again, I’m adding “panic” to the match report.',
    'Move early. Move small. Win quietly.',
    'Tip: stop chasing the ball’s past. Meet its future.',
    'You’re staring. The ball is not impressed.',
    'Your head is not decorative. Engage.',
    'If you’re thinking, do it while moving.',
    'Small touches. Big outcomes.',
    'You paused. The Imposter did not.',
    'You paused. The game didn’t.',
'Move. Even small movement keeps you alive.',
'If you freeze, the Imposter collects interest.',
'Don’t stand still—hold space.',
'Tip: meet the ball, don’t chase its shadow.',
'Keep drifting with purpose.',
'Small touches. Big outcomes.',
'If you’re thinking, think while moving.',
'Freeze again and I’m logging “buffering.”',
'You’re idle. The Imposter is not.',
'Stay active. Control is movement.',
'Don’t watch—shape the play.',
'Tip: stay central, then strike.',
'You paused. Reset your stance.',
'Move early. Move calm.',
'You’re waiting. Don’t.',
'Tip: cut angles, not corners.',
'You paused. Pressure rises.',
'Stay light on the controls.',
'Don’t admire the ball—own it.',
'You’re idle. That’s how goals happen (against you).',
'Tip: patience is active, not static.',
'Move. The grid rewards motion.',
'You paused. The lane opened.',
'Stay engaged. Keep your shape.',
'Tip: touch then reposition.',
'You’re idle. Composure doesn’t mean stillness.',
'Move small. Win big.',
'You paused. Don’t donate space.',
'Tip: stop chasing the past bounce.',
'You’re idle. That’s a free advantage for him.',
'Move. Defend your half.',
'Tip: cut inside lanes first.',
'You paused. Re-center.',
'Stay moving. Stay calm.',
'Tip: use angles like a system designer.',
'You’re idle. The ball is not a museum piece.',
'Move. Even a nudge helps.',
'Tip: play space, not panic.',
'You paused. Re-engage.'
  ];

  var L_STREAK_GOOD = [
     'Touch streak detected. Okay… you’re actually dribbling.',
    'You’re cooking. Don’t get greedy.',
    'Nice streak. Now finish like you mean it.',
    'That’s control. Keep it quiet.',
    'You’re stringing touches together. That’s dangerous.',
    'Touch streak rising. You’re in flow.',
'You’re stacking touches like wins. Good.',
'Nice streak. Now finish it.',
'Touch streak confirmed. Keep it disciplined.',
'You’re dribbling with rhythm now.',
'Okay, streak detected. Don’t get greedy.',
'That’s a real run of control.',
'Streak up. The Imposter is sweating.',
'Touch streak: clean. Keep it close.',
'You’re chaining touches. That’s dangerous.',
'Streak confirmed. You’re finding tempo.',
'Nice streak. Now create the shot.',
'You’re in rhythm. Don’t break it.',
'Touch streak. Calm hands, calm head.',
'Streak detected. That’s composed futbol.',
'You’re cooking. Finish the plate.',
'Touch streak climbing. Keep angles tight.',
'Streak confirmed. The grid respects this.',
'You’re chaining touches like a pro.',
'Nice streak. Now punish him.',
'Touch streak. You’re in control.',
'Streak detected. Don’t rush the finish.',
'You’re building pressure touch by touch.',
'Touch streak confirmed. Keep breathing.',
'Streak up. That’s real control.',
'You’re dribbling with discipline now.',
'Touch streak: strong. Create space.',
'Streak detected. That’s elite calm.',
'You’re chaining touches—beautiful.',
'Touch streak confirmed. Now strike.',
'Streak up. Don’t over-commit.',
'You’re in flow. Stay centered.',
'Touch streak. That’s confidence done right.',
'Streak detected. Keep it clean.',
'You’re controlling the bounce now.',
'Touch streak confirmed. You’re dangerous.',
'Streak up. Finish like a finisher.',
'You’re stringing touches like a system.',
'Touch streak detected. Maintain tempo.',
'Streak confirmed. That’s how you win.'
  ];

  // Idle + insight throttles
  function maybeIdleSpeak(){
    if(restoreScheduled) return;
    if(!state.running) return;

    var now = performance.now();
    var idleFor = now - state.lastInputTs;

    if(idleFor > 4200 && (now - state.lastIdleSpeakTs) > 5200){
      if(Math.random() < 0.10){
        var line = randomFrom(L_IDLE);
        logChat(line);
        speak(line, 1500);
        state.lastIdleSpeakTs = now;
        trackEvent('cavbot_futbol_idle_hint', { idleMs: Math.round(idleFor) });
      }
    }
  }

  /* ==========================================================
    (FIX #2) Level tuning -> factor + smarter imposter
    ========================================================== */
  function seedLevel(){
    state.level = Math.max(1, Math.min(6, analytics.futbolLevel || 1));
    state.tier = levelLabel(state.level);

    // smooth scaling: playable at 6, but noticeably smarter/faster
    var base = 0.94 + ((state.level - 1) * 0.12); // 0.94 .. 1.54
    state.factor = base;

    // Imposter: speed + prediction + aggression (aggression decreases slightly so it doesn't over-dive)
    state.impMaxSpeed = 6.6 * state.factor;                // faster over levels
    state.impAggro = 0.14 / (0.85 + (state.level * 0.08)); // steadier (less jittery)
    state.impPredict = 0.20 + (state.level * 0.035);       // smarter reads
  }

  function resetPositions(kickoffTo){
    state.youX = state.w * 0.24;
    state.youY = state.h * 0.50;

    state.impX = state.w * 0.76;
    state.impY = state.h * 0.50;

    state.bx = state.w * 0.50;
    state.by = state.h * 0.50;

    var dir = (kickoffTo === 'you') ? -1 : 1;
    var angle = (Math.random() * 0.9 - 0.45);
    var base = 5.2 + (state.factor * 0.38);

    state.bvx = dir * (base + Math.random() * 0.9);
    state.bvy = angle * (base + Math.random() * 0.9);

    state.touchStreak = 0;
    state.bestTouchStreakThisMatch = Math.max(state.bestTouchStreakThisMatch, state.touchStreak);
    state.lastTouchBy = null;

    state.lastYouX = null; state.lastYouY = null;
    state.youVX = 0; state.youVY = 0;

    state.lastImpX = null; state.lastImpY = null;
    state.impVX = 0; state.impVY = 0;

    state.slowMs = 0;

    render();
  }

  function applyFriction(dt){
    // (FIX #1) keep the match alive: slightly less friction + energy floor logic later
    var f = Math.pow(0.9966, dt); // was ~0.995 per frame; now more “alive”
    state.bvx *= f;
    state.bvy *= f;

    var max = 11.4 + (state.factor * 1.25);
    state.bvx = clamp(state.bvx, -max, max);
    state.bvy = clamp(state.bvy, -max, max);
  }

  function bounceWalls(){
    var left = state.pad + state.br;
    var right = state.w - state.pad - state.br;
    var top = state.pad + state.br;
    var bottom = state.h - state.pad - state.br;

    if(state.by < top){ state.by = top; state.bvy *= -1; }
    if(state.by > bottom){ state.by = bottom; state.bvy *= -1; }
    if(state.bx < left){ state.bx = left; state.bvx *= -1; }
    if(state.bx > right){ state.bx = right; state.bvx *= -1; }
  }

  /* ==========================================================
    (FIX #1) Imposter NEVER stalls:
    - always moving with prediction
    - stronger clears/shots when ball speed is low near him
    - bias his kicks to keep the ball active (back & forth)
    ========================================================== */
  function updateImposter(dt, now){
    // predict ball (smarter at higher levels)
    var pt = clamp(state.impPredict, 0.18, 0.48);
    var px = state.bx + state.bvx * (pt * 12); // scaled for px per frame style velocities
    var py = state.by + state.bvy * (pt * 12);

    // defend/attack posture (air-hockey style)
    // if ball on imposter side (right half) or traveling to right, pressure it harder
    var onRight = (state.bx > (state.w * 0.52)) || (state.bvx > 0.25);
    var goalieX = state.w - state.pad - 40;
    var centerY = state.h * 0.5;

    var tx = clamp(px, state.w/2 + 26, state.w - state.pad - 26);
    var ty = clamp(py, state.pad + 26, state.h - state.pad - 26);

    // goalie bias so he protects his goal mouth without freezing
    var bias = onRight ? 0.22 : 0.38;
    tx = (tx * (1 - bias)) + (goalieX * bias);
    ty = (ty * 0.86) + (centerY * 0.14);

    // add subtle vertical “alive” drift if perfectly aligned (prevents the dead stop look)
    var d0 = dist(state.impX, state.impY, tx, ty);
    if(d0 < 0.9){
      ty += Math.sin(now / 280) * (0.9 + (state.level * 0.10));
    }

    // accelerate toward target
    var dx = tx - state.impX;
    var dy = ty - state.impY;
    var d = Math.sqrt(dx*dx + dy*dy) || 1;

    // max speed scaled by dt
    var maxV = state.impMaxSpeed;
    var vx = (dx / d) * maxV;
    var vy = (dy / d) * maxV;

    // smooth (aggression factor)
    state.impVX = (state.impVX * (1 - state.impAggro)) + (vx * state.impAggro);
    state.impVY = (state.impVY * (1 - state.impAggro)) + (vy * state.impAggro);

    // update position
    state.impX += state.impVX * dt;
    state.impY += state.impVY * dt;

    // clamp to imposter half
    state.impX = clamp(state.impX, state.w/2 + 26, state.w - state.pad - 26);
    state.impY = clamp(state.impY, state.pad + 26, state.h - state.pad - 26);
  }

  // player movement (analog)
  function updatePlayerAnalog(dt){
    if(!state.useAnalog) return;

    // speed tuned so it feels like real stick control (no skating)
    var base = 7.2;
    var speed = base + (Math.min(1.0, (state.level-1)*0.12)); // tiny scaling

    var dx = state.ax;
    var dy = state.ay;

    // deadzone
    var mag = Math.sqrt(dx*dx + dy*dy);
    if(mag < 0.08){
      dx = 0; dy = 0; mag = 0;
    } else {
      // normalize & curve (more precision near center)
      var nx = dx / (mag || 1);
      var ny = dy / (mag || 1);
      var curved = Math.pow(mag, 1.12);
      dx = nx * curved;
      dy = ny * curved;
    }

    var newX = state.youX + (dx * speed * dt);
    var newY = state.youY + (dy * speed * dt);

    newX = clamp(newX, state.pad + 26, (state.w * 0.52) - 26);
    newY = clamp(newY, state.pad + 26, state.h - state.pad - 26);

    // velocity for kick power
    if(state.lastYouX == null){ state.lastYouX = newX; state.lastYouY = newY; }
    state.youVX = newX - state.lastYouX;
    state.youVY = newY - state.lastYouY;
    state.lastYouX = newX;
    state.lastYouY = newY;

    state.youX = newX;
    state.youY = newY;
  }

  function collideHead(headX, headY, headR, who){
    var d = dist(headX, headY, state.bx, state.by);
    var minD = headR + state.br;

    if(d < minD){
      var nx = (state.bx - headX) / (d || 0.0001);
      var ny = (state.by - headY) / (d || 0.0001);

      // (FIX #1) Imposter “active kick”: bias the collision normal slightly leftward (attack)
      // This prevents the low/weak tap + stall behavior.
      if(who === 'imposter'){
        var biasX = -0.88; // push left (toward your goal)
        var bx = (nx * 0.62) + (biasX * 0.78);
        var by = (ny * 0.80);
        var bl = Math.sqrt(bx*bx + by*by) || 1;
        nx = bx / bl;
        ny = by / bl;
      }

      state.bx = headX + nx * (minD + 0.2);
      state.by = headY + ny * (minD + 0.2);

      var kick = 0;
      if(who === 'you'){
        kick = Math.sqrt(state.youVX*state.youVX + state.youVY*state.youVY);
        kick = clamp(kick, 1.3, 11.6);
      }else{
        // (FIX #1) kick uses imposter motion so it never “dies” on contact
        var imps = Math.sqrt(state.impVX*state.impVX + state.impVY*state.impVY);
        kick = (4.4 * state.factor) + (imps * 0.55);
        kick = clamp(kick, 4.2, 10.8);
      }

      state.bvx = (state.bvx * 0.62) + (nx * kick * 0.95);
      state.bvy = (state.bvy * 0.62) + (ny * kick * 0.95);

      // shot detection (simple)
      var sp = Math.sqrt(state.bvx*state.bvx + state.bvy*state.bvy);
      if(who === 'you' && sp > 8.2 && Math.random() < 0.45) logChat(randomFrom(L_SHOT_YOU));
      if(who === 'imposter' && sp > 8.2 && Math.random() < 0.45) logChat(randomFrom(L_SHOT_IMP));

      kickSfx();

      if(who === 'you'){
        state.touchStreak += 1;
        state.bestTouchStreakThisMatch = Math.max(state.bestTouchStreakThisMatch, state.touchStreak);

        if(state.touchStreak >= 4 && Math.random() < 0.35){
          logChat(randomFrom(L_STREAK_GOOD));
        } else if(Math.random() < 0.30){
          logChat(randomFrom(L_TOUCH_YOU));
        }

        trackEvent('cavbot_futbol_touch', { who:'you', streak: state.touchStreak });
      }else{
        state.touchStreak = 0;
        if(Math.random() < 0.40) logChat(randomFrom(L_TOUCH_IMP));
        trackEvent('cavbot_futbol_touch', { who:'imposter' });
      }

      state.lastTouchBy = who;
      return true;
    }
    return false;
  }

  function checkGoal(){
    var leftPlane = state.pad + state.goalDepth;
    var rightPlane = state.w - state.pad - state.goalDepth;

    if(state.by > state.goalTop && state.by < state.goalBot){
      if(state.bx <= leftPlane){
        pointScored('imposter');
        return true;
      }
      if(state.bx >= rightPlane){
        pointScored('you');
        return true;
      }
    }
    return false;
  }

  function pointScored(winner){
    analytics.futbolLifetimeGoals += 1;

    if(winner === 'you'){
      state.youGoals += 1;
      analytics.futbolLifetimeShots += 1;

      logGame('GOAL · CAVBOT FC · streak ' + state.touchStreak, 'ok');
      logChat(randomFrom(L_GOAL_YOU));
      speak(randomFrom(L_GOAL_YOU), 1800);
      goalSfx();
      whistle();

      trackEvent('cavbot_futbol_goal', { winner:'you', you: state.youGoals, imposter: state.impGoals, level: state.level });

      // NEW RULE: do NOT redirect on first goal — keep arcade flow until 3
      resetPositions('imposter');

    } else {
      state.impGoals += 1;

      logGame('GOAL · IMPOSTER FC · conceded', 'warn');
      logChat(randomFrom(L_GOAL_IMP));
      speak(randomFrom(L_GOAL_IMP), 1800);
      goalSfx();
      whistle();

      trackEvent('cavbot_futbol_goal', { winner:'imposter', you: state.youGoals, imposter: state.impGoals, level: state.level });

      resetPositions('you');
    }

    if(state.bestTouchStreakThisMatch > (analytics.futbolBestStreak || 0)){
      analytics.futbolBestStreak = state.bestTouchStreakThisMatch;
      persistAnalytics();
      logGame('ANALYTICS · new best touch streak: ' + analytics.futbolBestStreak, 'ok');
      trackEvent('cavbot_futbol_streak_record', { bestStreak: analytics.futbolBestStreak });
    }

    render();

    if(state.youGoals >= state.targetGoals || state.impGoals >= state.targetGoals){
      endMatch();
    }
  }

  function endMatch(){
    state.running = false;
    if(state.raf != null){
      cancelAnimationFrame(state.raf);
      state.raf = null;
    }

    analytics.futbolMatches += 1;
    var elapsedMs = state.matchStart ? (performance.now() - state.matchStart) : 0;

    var youWon = state.youGoals > state.impGoals;
    if(youWon){
      analytics.futbolWins += 1;

      logChat(randomFrom(L_WIN));
      speak(randomFrom(L_WIN), 2400);
      whistle();

      if(analytics.futbolFastestWinMs == null || elapsedMs < analytics.futbolFastestWinMs){
        analytics.futbolFastestWinMs = elapsedMs;
        logGame('ANALYTICS · fastest win: ' + (elapsedMs/1000).toFixed(2) + 's', 'ok');
      }

      logGame('MATCH END · CAVBOT FC WINS · ' + state.youGoals + '-' + state.impGoals + ' · time ' + (elapsedMs/1000).toFixed(2) + 's', 'ok');
      trackEvent('cavbot_futbol_match_end', {
        result:'win',
        scoreYou: state.youGoals,
        scoreImposter: state.impGoals,
        elapsedMs: elapsedMs,
        bestStreak: state.bestTouchStreakThisMatch,
        level: state.level
      });

    } else {
      analytics.futbolLosses += 1;

      logChat(randomFrom(L_LOSS));
      speak(randomFrom(L_LOSS), 2400);
      whistle();

      logGame('MATCH END · IMPOSTER FC WINS · ' + state.youGoals + '-' + state.impGoals + ' · time ' + (elapsedMs/1000).toFixed(2) + 's', 'warn');
      trackEvent('cavbot_futbol_match_end', {
        result:'loss',
        scoreYou: state.youGoals,
        scoreImposter: state.impGoals,
        elapsedMs: elapsedMs,
        bestStreak: state.bestTouchStreakThisMatch,
        level: state.level
      });
    }

    // ==========================================================
    // NEW RULE: Level advances EVERY time they come back
    // - after match end (win OR loss): +1
    // - after level 6 -> reset to 1 (C)
    // ==========================================================
    var prevLevel = Math.max(1, Math.min(6, analytics.futbolLevel || 1));
    var nextLevel = prevLevel + 1;
    if(nextLevel > 6) nextLevel = 1;
    analytics.futbolLevel = nextLevel;

    logGame('LEVEL SHIFT · ' + levelLabel(nextLevel) + ' (next run)', 'ok');
    logChat('Next run: ' + levelLabel(nextLevel) + '.');
    trackEvent('cavbot_futbol_level_advance', { from: prevLevel, to: nextLevel, result: youWon ? 'win' : 'loss' });

    persistAnalytics();
    state.match = analytics.futbolMatches + 1;

    // Return to idle stance after end (briefly), then redirect to /3800
    setTimeout(function(){
      seedLevel();
      setIdlePositions();
      render();
      // NEW: redirect after match end ALWAYS (win or lose)
      scheduleRestoreRedirect(youWon ? 'match_end_win' : 'match_end_loss');
    }, 380);
  }

  function startMatch(force){
    restoreScheduled = false;
    state.scoredOnce = false;

    state.running = true;
    state.matchStart = performance.now();
    state.lastFrameTs = state.matchStart;

    state.youGoals = 0;
    state.impGoals = 0;
    state.touchStreak = 0;
    state.bestTouchStreakThisMatch = 0;

    seedLevel();

    logGame('MATCH START · ' + state.tier + ' · first to ' + state.targetGoals, 'ok');
    logChat(randomFrom(L_START));

    whistle();

    resetPositions(Math.random() < 0.5 ? 'you' : 'imposter');

    if(state.raf != null) cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(tick);
  }

  // Anti-stall “keep the match alive”
  function keepBallAlive(dt){
    var sp = Math.sqrt(state.bvx*state.bvx + state.bvy*state.bvy);
    if(sp < 1.15){
      state.slowMs += (dt * 16.67);
    }else{
      state.slowMs = 0;
    }

    // (FIX #1) if ball is dying for too long, inject a small, realistic nudge
    if(state.slowMs > 720){
      state.slowMs = 0;

      var dir = 0;
      if(state.lastTouchBy === 'imposter') dir = -1;
      else if(state.lastTouchBy === 'you') dir = 1;
      else dir = (Math.random()<0.5 ? -1 : 1);

      state.bvx += dir * (2.4 + (Math.random()*0.9));
      state.bvy += (Math.random()*2 - 1) * (1.2 + Math.random()*0.6);

      // keep within max after nudge
      var max = 11.4 + (state.factor * 1.25);
      state.bvx = clamp(state.bvx, -max, max);
      state.bvy = clamp(state.bvy, -max, max);
    }
  }

  function tick(now){
    if(!state.running) return;

    var dtMs = now - state.lastFrameTs;
    state.lastFrameTs = now;

    // normalize dt to “frames”
    var dt = clamp(dtMs / 16.67, 0.55, 1.85);

    maybeIdleSpeak();

    // update controls
    detectAnalog();
    if(state.useAnalog){
      updatePlayerAnalog(dt);
    }

    // AI
    updateImposter(dt, now);

    // Move ball
    state.bx += state.bvx * dt;
    state.by += state.bvy * dt;

    applyFriction(dt);
    keepBallAlive(dt);
    bounceWalls();

    // Collisions
    var headR = 28;

    // player (save detection if blocking near your goal mouth)
    var preVX = state.bvx, preVY = state.bvy;
    var hitYou = collideHead(state.youX, state.youY, headR, 'you');
    if(hitYou){
      // if ball was moving toward your goal (left) and you stopped it near goal mouth, call it a save
      if(preVX < -5.6 && state.bx < (state.w*0.30) && Math.random() < 0.22){
        logChat(randomFrom(L_SAVE));
        saveSfx();
      }
    }

    // imposter
    collideHead(state.impX, state.impY, headR, 'imposter');

    // Goal check
    if(checkGoal()){
      // ==========================================================
      // NEW RULE: true arcade flow — do NOT stop after a goal
      // keep the RAF loop alive unless match ended inside pointScored/endMatch
      // ==========================================================
      render();
      if(state.running){
        state.raf = requestAnimationFrame(tick);
      }
      return;
    }

    render();
    state.raf = requestAnimationFrame(tick);
  }

  // Buttons
  if(btnReset){
    btnReset.addEventListener('click', function(){
      startMatch(true);
      trackEvent('cavbot_futbol_reset', { level: state.level });
    });
  }

  // Boot
  detectAnalog();
  seedLevel();
  resize();
  setIdlePositions();
  startDmTypewriter();
  setSoundUI();

  logGame('BOOT · CavBot FC online · session ' + (session && session.id ? session.id : 'unknown'), 'ok');
  logGame('LEVEL · ' + levelLabel(analytics.futbolLevel || 1) + ' (persisted)', 'ok');
  logGame('REDIRECT · index locked to ' + INDEX_URL, 'ok');
  logChat(randomFrom(L_START));
  render();

})();
