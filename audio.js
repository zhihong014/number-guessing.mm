/* Numbering Guessing: shared sound for all pages.
   Sound effects + soft background music, made by the browser (no audio files needed).
   Volumes are saved in the player's browser and shared by every page. */
(function () {
  var KEY = 'ng-audio-v1';
  var st = { music: 0.4, sfx: 0.8, muted: false };
  function clamp(v) { v = Number(v); return isNaN(v) ? 0 : Math.max(0, Math.min(1, v)); }
  try {
    var p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (p) { if (p.music !== undefined) st.music = clamp(p.music); if (p.sfx !== undefined) st.sfx = clamp(p.sfx); st.muted = !!p.muted; }
  } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  var ctx = null, musicBus = null, sfxBus = null, timer = null, nextTime = 0, stepIdx = 0, musicOn = false, armed = true;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      musicBus = ctx.createGain(); sfxBus = ctx.createGain();
      musicBus.gain.value = 0; sfxBus.gain.value = 0;
      var dly = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();   // soft echo for the music
      dly.delayTime.value = 0.42; fb.gain.value = 0.35; wet.gain.value = 0.3;
      musicBus.connect(ctx.destination); musicBus.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(ctx.destination);
      sfxBus.connect(ctx.destination);
      applyVolumes();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function applyVolumes() {
    if (!ctx) return;
    var t = ctx.currentTime;
    musicBus.gain.setTargetAtTime(st.muted ? 0 : st.music * st.music * 0.6, t, 0.4);
    sfxBus.gain.setTargetAtTime(st.muted ? 0 : Math.min(1.3, st.sfx * st.sfx * 1.3), t, 0.03);
  }

  /* ----- soft generative background music: slow chords + gentle high notes ----- */
  var CHORDS = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]];   // C, Am, F, G
  var SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];                                                            // C major pentatonic
  var STEP = 0.475;
  function note(freq, at, dur, type, vol, attack) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(musicBus); o.start(at); o.stop(at + dur + 0.05);
  }
  function playStep(i, t) {
    var chord = CHORDS[Math.floor(i / 8) % 4];
    if (i % 8 === 0) chord.forEach(function (f) { note(f / 2, t, STEP * 8 + 1.2, 'sine', 0.07, 1.0); });
    if ((i % 2 === 0 && Math.random() < 0.8) || Math.random() < 0.2) {
      var f = Math.random() < 0.5 ? chord[Math.floor(Math.random() * 3)] * 2 : SCALE[Math.floor(Math.random() * SCALE.length)];
      note(f, t, 1.6, 'triangle', 0.045, 0.02);
    }
  }
  function tick() {
    if (!ctx || !musicOn) return;
    while (nextTime < ctx.currentTime + 1.2) { playStep(stepIdx, nextTime); nextTime += STEP; stepIdx++; }
  }
  function startMusic() {
    if (musicOn || st.muted || st.music <= 0 || !ensure()) return;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
    musicOn = true; nextTime = ctx.currentTime + 0.1; stepIdx = 0; applyVolumes(); tick(); timer = setInterval(tick, 250);
  }
  function stopMusic() { musicOn = false; clearInterval(timer); applyVolumes(); }

  /* ----- sound effects ----- */
  function tone(f, at, dur, type, vol) {
    if (st.muted || !ensure()) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + (at || 0);
      o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  function melody(notes, step, type, vol) { notes.forEach(function (f, i) { tone(f, i * step, step * 1.6, type, vol); }); }
  var SFX = {
    click: function () { tone(660, 0, 0.07, 'triangle', 0.12); },
    sent: function () { tone(520, 0, 0.08, 'triangle', 0.12); tone(780, 0.07, 0.1, 'triangle', 0.12); },
    score: function (s) { tone([260, 340, 420, 520][s] || 260, 0, 0.2, 'sine', 0.16); },
    oppGuess: function () { tone(420, 0, 0.1, 'square', 0.06); },
    yourTurn: function (d) { d = d || 0; tone(880, d, 0.12, 'sine', 0.14); tone(1175, d + 0.12, 0.18, 'sine', 0.14); },
    join: function () { melody([523, 784], 0.12, 'sine', 0.14); },
    react: function () { melody([988, 1319], 0.08, 'sine', 0.12); },
    roundWin: function () { melody([523, 659, 784, 1047], 0.11, 'triangle', 0.16); },
    roundLose: function () { melody([392, 330, 262], 0.16, 'sine', 0.14); },
    matchWin: function () { melody([523, 659, 784, 1047, 784, 1047, 1319], 0.12, 'triangle', 0.18); },
    matchLose: function () { melody([330, 294, 262, 196], 0.2, 'sine', 0.14); }
  };

  /* ----- start the music on the first tap or key press (browsers require this) ----- */
  var EVENTS = ['pointerdown', 'keydown', 'touchstart'];
  function onGesture() {
    if (!armed) return; armed = false;
    EVENTS.forEach(function (e) { document.removeEventListener(e, onGesture, true); });
    if (ensure()) { try { ctx.resume(); } catch (e) {} startMusic(); }
  }
  EVENTS.forEach(function (e) { document.addEventListener(e, onGesture, true); });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    try { document.hidden ? ctx.suspend() : ctx.resume(); } catch (e) {}
  });

  window.NGAudio = {
    get: function () { return { music: st.music, sfx: st.sfx, muted: st.muted }; },
    setMusic: function (v) { st.music = clamp(v); save(); applyVolumes(); if (st.music > 0) startMusic(); else stopMusic(); },
    setSfx: function (v) { st.sfx = clamp(v); save(); applyVolumes(); },
    setMuted: function (m) { st.muted = !!m; save(); applyVolumes(); if (st.muted) stopMusic(); else startMusic(); },
    play: function (name, arg) { if (SFX[name]) SFX[name](arg); }
  };
})();
