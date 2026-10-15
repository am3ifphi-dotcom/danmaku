/* ============================================================
 * 常夜桜 audio.js
 * WebAudio 全自作音響: 合成SFX + シーケンサBGM
 * 楽曲: タイトル「常夜想」/ ボス戦「月詠」(都節・陰旋法の響き)
 * ============================================================ */
'use strict';

const mf = m => 440 * Math.pow(2, (m - 69) / 12); // midi→Hz

const AudioSys = {
  ctx: null, master: null, musicG: null, sfxG: null,
  noiseBuf: null,
  musicOn: true, sfxOn: true,
  unlocked: false,

  unlock() {
    if (this.unlocked) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 5; comp.knee.value = 18;
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.musicG = this.ctx.createGain();
      this.musicG.gain.value = this.musicOn ? 0.5 : 0;
      this.musicG.connect(this.master);
      this.sfxG = this.ctx.createGain();
      this.sfxG.gain.value = this.sfxOn ? 0.62 : 0;
      this.sfxG.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.unlocked = true;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      Music._onUnlock();
    } catch (e) { /* 音なし環境では静かに無効化 */ }
  },

  toggleMusic() { this.musicOn = !this.musicOn; if (this.musicG) this.musicG.gain.value = this.musicOn ? 0.5 : 0; },
  toggleSfx() { this.sfxOn = !this.sfxOn; if (this.sfxG) this.sfxG.gain.value = this.sfxOn ? 0.62 : 0; },
  setAll(on) {
    this.musicOn = on; this.sfxOn = on;
    if (this.musicG) this.musicG.gain.value = on ? 0.5 : 0;
    if (this.sfxG) this.sfxG.gain.value = on ? 0.62 : 0;
  },

  /* --- 小道具 --- */
  env(g, t, a, peak, d, sustain = 0) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0004, sustain), t + a + d);
  },
  osc(type, f0, f1, t, dur, gain, dest) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== null && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, 0.004, gain, dur);
    o.connect(g); g.connect(dest || this.sfxG);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  },
  noise(t, dur, gain, filterType = 'bandpass', freq = 2000, q = 1, dest) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t, 0.003, gain, dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxG);
    src.start(t); src.stop(t + dur + 0.05);
    return { src, f, g };
  },
};
G.audio = AudioSys;

/* ============================== SFX ============================== */
const SFX = {
  _last: {},
  _gate(key, ms) {
    if (!AudioSys.ctx) return false;
    const now = performance.now();
    if (this._last[key] && now - this._last[key] < ms) return false;
    this._last[key] = now; return true;
  },

  ui() { if (!this._gate('ui', 30)) return; const t = AudioSys.ctx.currentTime; AudioSys.osc('triangle', 660, 660, t, 0.05, 0.12); },
  move() { if (!this._gate('mv', 26)) return; const t = AudioSys.ctx.currentTime; AudioSys.osc('square', 880, 880, t, 0.03, 0.05); },
  confirm() {
    if (!AudioSys.ctx) return; const t = AudioSys.ctx.currentTime;
    AudioSys.osc('triangle', 523, 523, t, 0.07, 0.14);
    AudioSys.osc('triangle', 784, 784, t + 0.06, 0.12, 0.14);
  },
  graze() { if (!this._gate('gz', 34)) return; const t = AudioSys.ctx.currentTime; AudioSys.osc('sine', 3400 + rnd(-300, 300), null, t, 0.028, 0.05); },
  soft() { if (!this._gate('sf', 90)) return; const t = AudioSys.ctx.currentTime; AudioSys.noise(t, 0.03, 0.02, 'highpass', 4000); },
  shootSoft() { if (!this._gate('sh', 70)) return; const t = AudioSys.ctx.currentTime; AudioSys.osc('sine', 1900, 1400, t, 0.035, 0.035); },
  hit() {
    if (!AudioSys.ctx) return; const t = AudioSys.ctx.currentTime;
    AudioSys.noise(t, 0.5, 0.5, 'lowpass', 900, 0.8);
    AudioSys.osc('sawtooth', 200, 30, t, 0.5, 0.34);
    AudioSys.osc('sine', 90, 32, t, 0.4, 0.5);
  },
  respawn() { if (!AudioSys.ctx) return; const t = AudioSys.ctx.currentTime; AudioSys.osc('sine', 300, 1200, t, 0.3, 0.10); },
  warn() {
    if (!AudioSys.ctx) return; const t = AudioSys.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      AudioSys.osc('sawtooth', 466, 466, t + i * 0.42, 0.17, 0.10);
      AudioSys.osc('sawtooth', 622, 622, t + i * 0.42 + 0.19, 0.17, 0.10);
    }
    AudioSys.noise(t, 1.3, 0.05, 'lowpass', 300, 1);
  },
  phase() {
    if (!AudioSys.ctx) return; const t = AudioSys.ctx.currentTime;
    [76, 79, 83].forEach((n, i) => AudioSys.osc('triangle', mf(n), null, t + i * 0.07, 0.5, 0.12));
    AudioSys.noise(t, 0.3, 0.03, 'highpass', 6000);
  },
  mandala() { if (!this._gate('md', 500)) return; const t = AudioSys.ctx.currentTime; [69, 72, 76, 81].forEach((n, i) => AudioSys.osc('triangle', mf(n), null, t + i * 0.05, 0.4, 0.07)); },
  laserCharge() { if (!this._gate('lz', 400)) return; const t = AudioSys.ctx.currentTime; const n = AudioSys.noise(t, 0.7, 0.05, 'bandpass', 500, 4); if (n) n.f.frequency.exponentialRampToValueAtTime(3200, t + 0.7); },
  countTick() { if (!this._gate('ct', 240)) return; const t = AudioSys.ctx.currentTime; AudioSys.osc('sine', 1200, null, t, 0.06, 0.09); },
  fanfare() {
    if (!AudioSys.ctx) return; const t = AudioSys.ctx.currentTime;
    /* 太鼓2連 + 琴の上行 + 鐘 */
    AudioSys.osc('sine', 150, 46, t, 0.3, 0.5);
    AudioSys.osc('sine', 150, 46, t + 0.22, 0.3, 0.42);
    [69, 72, 74, 76, 79, 81, 84].forEach((n, i) => AudioSys.osc('triangle', mf(n), mf(n) * 1.01, t + 0.1 + i * 0.07, 0.7, 0.10));
    AudioSys.osc('sine', mf(81), null, t + 0.62, 1.8, 0.12);
    AudioSys.osc('sine', mf(81) * 2.8, null, t + 0.62, 1.4, 0.03);
  },
  gameover() {
    if (!AudioSys.ctx) return; const t = AudioSys.ctx.currentTime;
    [57, 55, 52, 50].forEach((n, i) => AudioSys.osc('triangle', mf(n), mf(n) * 0.985, t + 0.15 + i * 0.30, 1.0, 0.13));
    AudioSys.noise(t + 1.2, 1.2, 0.02, 'lowpass', 400);
  },
};

/* ============================== MUSIC ==============================
 * シーケンサ: 都節(みやこぶし)的ペンタを軸にした和の響き
 * ボス曲「月詠」はフェーズ進行で楽器が増殖
 */
const Music = {
  playing: null, bpm: 132, step: 0, bar: 0, nextT: 0, timer: null,
  bossPhase: 0, name: null,

  _onUnlock() { if (this._pending) this.start(this._pending); },

  start(name) {
    if (!AudioSys.ctx) { this._pending = name; return; }
    this._pending = null;
    if (this.name === name) return;
    this.stop();
    this.name = name;
    this.bpm = name === 'title' ? 92 : 132;
    this.step = 0; this.bar = 0;
    this.nextT = AudioSys.ctx.currentTime + 0.06;
    this.playing = true;
    this.timer = setInterval(() => this._tick(), 25);
  },
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null; this.name = null; this.playing = false;
  },
  setPhase(i) {
    if (this.bossPhase !== i && this.name === 'boss') this._fill = true;
    this.bossPhase = i;
  },

  _tick() {
    if (!this.playing || !AudioSys.ctx) return;
    const stepDur = 60 / this.bpm / 4;
    while (this.nextT < AudioSys.ctx.currentTime + 0.16) {
      this._playStep(this.bar, this.step, this.nextT);
      this.nextT += stepDur;
      this.step++;
      if (this.step >= 16) { this.step = 0; this.bar++; }
    }
  },

  /* A dur... ではなく A宮の都節: 低域は Am 系進行で安定 */
  _playStep(bar, step, t) {
    const D = 60 / this.bpm / 4;
    if (this.name === 'title') return this._titleStep(bar, step, t, D);
    if (this.name === 'boss') return this._bossStep(bar, step, t, D);
  },

  /* ------- タイトル「常夜想」: 静寂の琴 ------- */
  _titleStep(bar, step, t, D) {
    const g = AudioSys.musicG;
    const CH = [[45, 52, 60], [41, 48, 60], [43, 50, 62], [40, 47, 59]]; // Am F G Em
    const chord = CH[bar % 4];
    if (step === 0) {
      for (const n of chord) padVoice(t, n, D * 16, 0.028, g);
      AudioSys.osc('sine', mf(chord[0] - 12), null, t, D * 10, 0.05, g);
    }
    /* 琴: 盤渦・ランダム味のある即興 */
    const KOTO_A = [0, -1, 2, -1, 1, -1, 3, -1, -1, 2, -1, 1, -1, -1, 0, -1];
    const SCALE = [69, 71, 72, 76, 79, 81, 83, 84];
    const k = KOTO_A[step];
    if (k >= 0) {
      const n = SCALE[(bar * 2 + k) % SCALE.length];
      koto(t, mf(n), 0.09, g);
      if (step % 8 === 4) koto(t, mf(n - 12), 0.06, g);
    }
    /* 遠い鐘 */
    if (bar % 4 === 3 && step === 8) bell(t, mf(64), 2.0, 0.05, g);
    /* 風 */
    if (step === 0 && bar % 2 === 0) AudioSys.noise(t, D * 16, 0.008, 'bandpass', 600, 0.6, g);
  },

  /* ------- ボス戦「月詠」: 8フェーズで楽器が重なる ------- */
  _bossStep(bar, step, t, D) {
    const g = AudioSys.musicG;
    const ph = this.bossPhase;           // 0..7
    const dark = ph === 6;
    const PROG = [[45, 52, 60], [45, 52, 60], [41, 53, 60], [43, 55, 62], [38, 50, 57], [36, 48, 57], [41, 53, 60], [40, 52, 59]];
    const chord = PROG[bar % 8];
    const root = chord[0];
    const fill = this._fill && step >= 12;
    if (fill && step === 15) this._fill = false;

    /* -- 太鼓 (低域の心臓): ph>=0 -- */
    const TAIKO = ph >= 6
      ? [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0]
      : [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,1,0];
    if (TAIKO[step] || fill) taiko(t, fill ? 0.9 : 0.9, g);

    /* -- 締太鼓シメ: ph>=1 -- */
    if (ph >= 1) {
      const SHIME = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0.5];
      const v = SHIME[step];
      if (v) shime(t, 0.5 * v, g);
    }
    /* -- ベース: ph>=0, 常夜(ph6)は半音勅 -- */
    const BASS = dark
      ? [1,-1,-1,-1, -1,-1,0,-1, 1,-1,-1,-1, -1,0,-1,-1]
      : [1,-1,-1,1, -1,-1,1,-1, 1,-1,-1,1, -1,1,-1,-1];
    const b = BASS[step];
    if (b !== -1 && b !== 0) bassVoice(t, root - 12, D * 1.6, 0.16, g);

    /* -- 和音パッド: ph>=0 -- */
    if (step === 0) for (const n of chord) padVoice(t, n, D * 16, dark ? 0.016 : 0.024, g);

    /* -- 琴リード: ph>=2 (都築的フレーズ) -- */
    if (ph >= 2) {
      const MOTO = ph >= 7
        ? [0,-1,2,-1, 4,-1,3,-1, 5,-1,4,3, 2,-1,1,-1]
        : [0,-1,-1,2, -1,-1,3,-1, -1,4,-1,-1, 3,-1,2,-1];
      const SCALE = dark ? [69, 70, 74, 76, 79, 81, 82, 86] : [69, 71, 72, 76, 79, 81, 83, 84];
      const k = MOTO[step];
      if (k >= 0) {
        const idx = (bar * 3 + k * 2) % SCALE.length;
        koto(t, mf(SCALE[idx]), 0.085, g);
      }
    }
    /* -- 鈴ベル打ち: ph>=3 -- */
    if (ph >= 3 && step === 12 && bar % 2 === 0) bell(t, mf(root + 31), 1.2, 0.045, g);

    /* -- 高アルペジオ: ph>=4 -- */
    if (ph >= 4) {
      if (step % 2 === 0) {
        const n = chord[step % 4 === 0 ? 0 : (step % 4 === 2 ? 1 : 2)] + 24;
        AudioSys.osc('square', mf(n), null, t, D * 0.9, dark ? 0.014 : 0.02, g);
      }
    }
    /* -- ドローン(常夜のみ) -- */
    if (dark && step === 0) AudioSys.osc('sawtooth', mf(root - 24), null, t, D * 16, 0.05, g);
    /* -- クライマックスの鈴連打: ph7 -- */
    if (ph === 7 && step % 4 === 0) bell(t, mf(88), 0.5, 0.03, g);
  },
};

/* 楽器ボイス */
function taiko(t, v, dest) {
  const c = AudioSys.ctx;
  AudioSys.osc('sine', 150, 44, t, 0.34, 0.42 * v, dest);
  AudioSys.noise(t, 0.06, 0.12 * v, 'lowpass', 900, 1, dest);
}
function shime(t, v, dest) {
  AudioSys.noise(t, 0.05, 0.14 * v, 'bandpass', 2600, 5, dest);
}
function bassVoice(t, n, dur, v, dest) {
  const c = AudioSys.ctx;
  const o = c.createOscillator(), gn = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = mf(n);
  f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 4;
  AudioSys.env(gn, t, 0.01, v, dur);
  o.connect(f); f.connect(gn); gn.connect(dest);
  o.start(t); o.stop(t + dur + 0.1);
}
function padVoice(t, n, dur, v, dest) {
  const c = AudioSys.ctx, gn = c.createGain(), f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1100;
  for (const det of [-7, 7]) {
    const o = c.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = mf(n); o.detune.value = det;
    o.connect(f); o.start(t); o.stop(t + dur + 0.2);
  }
  gn.gain.setValueAtTime(0, t);
  gn.gain.linearRampToValueAtTime(v, t + dur * 0.3);
  gn.gain.linearRampToValueAtTime(v * 0.7, t + dur * 0.8);
  gn.gain.linearRampToValueAtTime(0, t + dur);
  f.connect(gn); gn.connect(dest);
}
function koto(t, freq, v, dest) {
  const c = AudioSys.ctx;
  AudioSys.osc('triangle', freq * 1.004, freq, t, 0.5, v, dest);
  AudioSys.osc('square', freq * 2, freq * 2, t, 0.08, v * 0.18, dest);
}
function bell(t, freq, dur, v, dest) {
  AudioSys.osc('sine', freq, null, t, dur, v, dest);
  AudioSys.osc('sine', freq * 2.76, null, t, dur * 0.6, v * 0.3, dest);
  AudioSys.osc('sine', freq * 5.4, null, t, dur * 0.3, v * 0.12, dest);
}
