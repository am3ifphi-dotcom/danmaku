// Audio: SFX and BGM are synthesized with ZzFX (MIT, vendor/zzfx). No recorded audio is used.
// BGM is a small step sequencer that pre-renders each note with ZZFX.buildSamples and schedules
// it on the shared AudioContext, so tempo does not drift with the game loop.
import { ZZFX } from '../vendor/zzfx/ZzFX.js';

const ctx = ZZFX.audioContext;

// ZzFX parameter presets: [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve,
// slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo]
const SFX = {
  graze:   [.45, 0, 880, .004, .02, .08, 0, 1.4, 6, 0, 0, 0, 0, 0, 0, 0, 0, .6, .04],
  hit:     [1.5, .05, 220, .01, .12, .3, 2, 1.6, -40, 0, 0, 0, 0, 1.2, 0, .2, .05, .7, .1],
  phase:   [.9, 0, 330, .02, .18, .42, 1, 1.2, 4, 0, 60, .08, 0, 0, 0, 0, 0, .8, .08],
  warn:    [.35, 0, 660, .005, .02, .07, 0, 1.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, .7, .03],
  shot:    [.2, .05, 720, .002, .01, .05, 3, 1, -20, 0, 0, 0, 0, 0, 0, 0, 0, .5, .02],
  clear:   [.9, 0, 523, .02, .1, .28, 1, 1.2, 0, 0, 220, .06, 0, 0, 0, 0, 0, .9, .14],
  fail:    [1.2, 0, 180, .03, .25, .5, 2, 1.5, -18, 0, 0, 0, 0, 0, 0, .1, .1, .6, .18],
  select:  [.35, 0, 1200, .001, .02, .03, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .6, .01],
  confirm: [.5, 0, 660, .005, .03, .1, 1, 1.4, 20, 0, 0, 0, 0, 0, 0, 0, 0, .7, .04],
  kick:    [.9, 0, 110, .001, .02, .08, 0, 2, -30, 0, 0, 0, 0, 0, 0, 0, 0, .3, .05],
  hat:     [.18, 0, 8000, .001, .01, .03, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .3, .01],
};

// semitone helper: A4 = 440Hz
export function note(semi) { return 440 * Math.pow(2, semi / 12); }

export class Audio {
  constructor() {
    this.enabled = true;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = 0.22;
    this.bgmGain.connect(ZZFX.audioContext.destination);
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(ctx.destination);
    this.cache = new Map();
    this.track = null;
    this.timer = null;
    this.nextTime = 0;
    this.step = 0;
    this.layer = 0; // 0 = normal, 1 = tension (turned on when phase is about to end)
  }

  async resume() {
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) { /* ignore */ } }
  }

  sfx(name, pitchShift = 0) {
    if (!this.enabled || !SFX[name]) return;
    const p = SFX[name].slice();
    if (pitchShift) p[2] *= Math.pow(2, pitchShift / 12);
    const samples = ZZFX.buildSamples(...p);
    this._play(samples, this.sfxGain, ctx.currentTime + 0.001);
  }

  _play(channel, dest, when) {
    const buf = ctx.createBuffer(1, channel.length, ZZFX.sampleRate);
    buf.getChannelData(0).set(channel);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(dest);
    src.start(when);
  }

  // Render a note once and reuse it (instrument key + freq).
  _noteBuf(inst, freq, dur) {
    const key = inst + '|' + freq.toFixed(2) + '|' + dur;
    let b = this.cache.get(key);
    if (!b) {
      const p = {
        square: [0.5, 0, freq, 0.005, dur * 0.7, 0.04, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.65, 0.02],
        bass: [0.9, 0, freq, 0.01, dur * 0.8, 0.04, 2, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0.03],
        tri: [0.7, 0, freq, 0.004, dur * 0.6, 0.06, 1, 0.8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.02],
        pad: [0.25, 0, freq, 0.25, dur * 0.9, 0.3, 1, 0.6, 0, 0, 0, 0, 0, 0, 0.7, 0, 0.04, 0.8, 0.1],
      }[inst];
      b = ZZFX.buildSamples(...p);
      this.cache.set(key, b);
    }
    return b;
  }

  _perc(name) {
    const key = 'perc|' + name;
    let b = this.cache.get(key);
    if (!b) { b = ZZFX.buildSamples(...SFX[name]); this.cache.set(key, b); }
    return b;
  }

  // Music definitions. Each track is 2 bars of 8ths (16 steps per bar) and loops.
  // Notes are semitone offsets from A3 (= 57 semitones from A4 is handled below).
  setTrack(name) {
    if (this.track === name) return;
    this.track = name;
    this.layer = 0;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    if (!this.timer) this.timer = setInterval(() => this._schedule(), 60);
    if (!name) { this.stopAll(); return; }
    this._schedule();
  }

  setLayer(n) { this.layer = n; }

  stopAll() {
    clearInterval(this.timer);
    this.timer = null;
  }

  _schedule() {
    const T = TRACKS[this.track];
    if (!T || !this.enabled) return;
    const stepDur = 60 / T.bpm / 2; // 8th notes
    while (this.nextTime < ctx.currentTime + 0.25) {
      const i = this.step % T.steps;
      // bass
      const bn = T.bass[i];
      if (bn !== null && bn !== undefined) {
        this._play(this._noteBuf('bass', note(T.root + bn), stepDur * 1.5), this.bgmGain, this.nextTime);
      }
      // lead / arp
      const an = T.arp[i];
      if (an !== null && an !== undefined) {
        const off = (this.layer && i % 4 === 0) ? 12 : 0;
        this._play(this._noteBuf('square', note(an + T.root + off), stepDur * 0.9), this.bgmGain, this.nextTime);
      }
      // pad only on bar starts
      if (i === 0 && T.pad) {
        this._play(this._noteBuf('pad', note(T.pad + T.root), stepDur * T.steps), this.bgmGain, this.nextTime);
      }
      // percussion (kick/hat) — the tension layer adds hats and a harder kick
      if (T.kick && T.kick[i]) this._play(this._perc('kick'), this.bgmGain, this.nextTime);
      if (this.layer && i % 2 === 1) this._play(this._perc('hat'), this.bgmGain, this.nextTime);
      this.nextTime += stepDur;
      this.step++;
    }
  }
}

// Track definitions. root: semitones from A4 for the tonic (e.g. -12 = A3).
// bass/arp are semitone offsets relative to root.
const TRACKS = {
  title: {
    bpm: 96, steps: 16, root: -12,
    bass: [0, null, 0, null, 3, null, 3, null, 5, null, 5, null, 7, null, 5, null],
    arp: [12, 15, 19, 15, 12, 15, 19, 22, 17, 20, 24, 20, 19, 15, 12, 15],
    pad: 0, kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  },
  seashell: {
    bpm: 112, steps: 16, root: -12,
    bass: [0, 0, 12, 0, 0, 0, 10, 0, 3, 3, 15, 3, 1, 1, 13, 1],
    arp: [12, 15, 19, 24, 19, 15, 12, 15, 17, 20, 24, 20, 15, 19, 22, 19],
    pad: 0, kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
  },
  cannon: {
    bpm: 132, steps: 16, root: -14,
    bass: [0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, -2, -2, 3, 3],
    arp: [12, 13, 12, 15, 12, 13, 17, 15, 14, 15, 14, 18, 15, 17, 19, 17],
    pad: 0, kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
  },
  totem: {
    bpm: 150, steps: 16, root: -14,
    bass: [0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 2, -1, -1, -1, 0],
    arp: [12, 15, 12, 18, 14, 17, 13, 16, 12, 15, 12, 18, 11, 14, 17, 14],
    pad: 0, kick: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
  },
  clear: {
    bpm: 120, steps: 16, root: -12,
    bass: [0, null, 4, null, 7, null, 12, null, 7, null, 4, null, 0, null, null, null],
    arp: [12, 16, 19, 24, 19, 16, 12, 16, 19, 24, 28, 24, 19, 24, 28, 31],
    pad: 0, kick: null,
  },
};

export { TRACKS };
