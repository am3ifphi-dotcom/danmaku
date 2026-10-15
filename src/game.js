// Game controller: screens (title / select / stage / pause / result / game over / credits),
// the stage runtime (intro -> phases with transitions -> clear), HUD, and save data.
import { W, H, FPS, DIFFICULTY, LS, SPRITE_SCALE } from './config.js';
import { Boss } from './boss.js';
import { Bullets } from './bullets.js';
import { Player } from './player.js';
import { FX } from './fx.js';
import { STAGES, cannonFireAt, cannonAim } from './stages.js';
import { makeBands } from './assets.js';
import { TRACKS } from './audio.js';
import { View, FLAT_MIN_Y, DEPTH_MIN_Y } from './view.js';

const DIFF_ORDER = ['easy', 'normal', 'hard'];
const SCORE_MULT = { easy: 1, normal: 1.5, hard: 2 };
const CREDITS = [
  'Pixel Frog “Treasure Hunters” (CC0 1.0) — player, Crabby, Seashell, Cannon/Totem traps, coin, diamonds, dust, cloud background (pixel-matched to the PixelRubro mirror)',
  'PixelRubro/Pixel-Art-Prototyping-CC0-Collection (CC0 1.0) — repository that redistributes the Pixel Frog packs above',
  'DotGothic16 by fontworks / Google Fonts (SIL OFL 1.1) — UI font, via @fontsource/dotgothic16',
  'ZzFX by Frank Force (MIT) — sound and music synthesis (no recorded audio)',
  'Procedural: orbs, diamonds, bands, lasers, safe-zone, banners — drawn in code by this project',
];

// ---------------------------------------------------------------------------------------------
// Stage runtime
// ---------------------------------------------------------------------------------------------
class StageRun {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    const diff = game.diff;
    this.diff = diff;
    this.S = game.sprites;
    this.audio = game.audio;
    this.player = new Player(game.sprites, diff);
    this.boss = new Boss(game.sprites, def.boss);
    this.boss.x = W / 2; this.boss.y = -70;
    this.boss.homeX = W / 2; this.boss.homeY = 96;
    this.B = new Bullets();
    this.fx = new FX(game.sprites);
    this.view = new View();  // pseudo-3D camera (only active in phases with cam3d)
    this.phaseIdx = 0;
    this.phaseT = 0;     // frames in phase
    this.T = 0;          // frames in stage (play only)
    this.introT = 0;
    this.transT = 0;
    this.clearT = 0;
    this.state = 'intro';
    this.score = 0;
    this.graze = 0;
    this.grazeSfxCooldown = 0;
    this.misses = 0;
    this.cannonState = [0, 0];
    this.safe = null;
    this.cellStars = [];
    this.totalFrames = def.phases.reduce((a, p) => a + p.dur * 60, 0);
    this.elapsedBonus = 0;
    this.ctx = null;
    this.clock = 0;
    // stage bullet sprite
    const sprite = def.bullet === 'pearl' ? game.sprites.map['seashell/pearl_idle'][0] : null;
    this.S_ctx = { bullet: sprite, cannonBall: game.sprites.map['cannon/cannon_ball_idle'][0] };
    this.bg = makeBands(W, H, def.bg.top, def.bg.bottom, 18);
    // stars for storm stage
    for (let i = 0; i < 46; i++) this.cellStars.push({ x: Math.random() * W, y: Math.random() * H * 0.6, p: Math.random() * 6 });

    this.B.onHit = (src) => this.onHit(src);
    this.B.onGraze = (b) => this.onGraze(b);
    this.B.onCancel = (b) => this.fx.burst(b.x, b.y, 2, b.color === 'teal' ? '#9ff6e4' : '#ffffff', 1.0, 14);

    this.ctx = {
      t: 0, T: 0, sp: diff.speed, cnt: diff.count, ivl: diff.interval, hom: diff.homing, gap: diff.gap,
      B: this.B, boss: this.boss, player: this.player, fx: this.fx, audio: this.audio, S: this.S_ctx,
      s: {}, cannons: def.cannons || [], cannonState: this.cannonState, safe: null,
      cannonShot: (side, speed, opts = {}) => (opts.angle !== undefined
        ? cannonFireAt(this.ctx, side, opts.angle, speed, opts)
        : cannonAim(this.ctx, side, speed, opts)),
    };
  }

  get phase() { return this.def.phases[this.phaseIdx]; }

  get remainingSec() {
    return Math.max(0, Math.ceil((this.totalFrames - this.T) / 60));
  }

  enterPhase() {
    const c = this.ctx;
    c.s = {};
    c.t = 0;
    c.safe = this.phase.safe ? this.phase.safe(c) : null;
    this.safe = c.safe;
    if (this.phase.enter) this.phase.enter(c);
  }

  onHit(src) {
    if (this.state !== 'play') return;
    const p = this.player;
    if (p.invuln > 0 || p.down > 0) return;
    // remember the culprit for debugging / tests
    this.lastHit = src && src.vx !== undefined ? { x: src.x, y: src.y, vx: src.vx, vy: src.vy, age: src.age, turned: src.turned, sprite: !!src.sprite } : { laser: true };
    p.lives--;
    this.misses++;
    p.knockOut();
    this.audio.sfx('hit');
    this.fx.shake(9, 18);
    this.fx.flash('#ff3d62', 0.45);
    this.fx.anim(this.S.map['cannon/cannon_ball_explosion'], p.x, p.y, 14, 2);
    // clear bullets around the respawn point so the comeback is fair
    for (const b of this.B.list) {
      if (b.delay > 0 || b.fade) continue;
      const dx = b.x - p.x, dy = b.y - p.y;
      if (dx * dx + dy * dy < 90 * 90) { b.fade = 1; this.B.onCancel(b); }
    }
    // lives = remaining hits before game over; the hit that empties the last life is fatal
    if (p.lives <= 0) this.game.gameOver();
  }

  onGraze(b) {
    if (this.state !== 'play' || this.player.down > 0) return;
    this.graze++;
    this.score += 25;
    if (this.grazeSfxCooldown <= 0) { this.audio.sfx('graze'); this.grazeSfxCooldown = 6; }
    this.fx.burst(this.player.x, this.player.y, 2, '#fff5a8', 1.2, 12);
    void b;
  }

  update() {
    this.clock++;
    if (this.grazeSfxCooldown > 0) this.grazeSfxCooldown--;
    if (this.state === 'intro') this.updateIntro();
    else if (this.state === 'play') this.updatePlay();
    else if (this.state === 'trans') this.updateTrans();
    else if (this.state === 'clear') this.updateClear();

    // Ambient effects
    this.fx.update();
    this.boss.update();
    for (let i = 0; i < this.cannonState.length; i++) if (this.cannonState[i] > 0) this.cannonState[i]--;
    this.B.update(this.player, this.state === 'play' && this.player.invuln === 0 && this.player.down === 0);
    // the upper movement limit eases with the 3D blend (ship stays in front of the boss)
    this.player.minY = FLAT_MIN_Y + (DEPTH_MIN_Y - FLAT_MIN_Y) * this.view.e;
    this.player.update(this.game.inputState());
    // camera: follows the ship; 3D blend only while a cam3d phase is actually being played
    this.view.update(this.player.y, this.state === 'play' && !!(this.phase && this.phase.cam3d));
  }

  updateIntro() {
    this.introT++;
    const b = this.boss;
    // boss descends into view
    b.y += (b.homeY - b.y) * 0.06;
    if (this.introT === 1) {
      this.fx.showBanner(this.def.name, this.def.en, 150);
      this.audio.setTrack(this.def.music);
    }
    if (this.introT >= 150) {
      this.state = 'play';
      this.enterPhase();
      this.fx.showBanner(`PHASE 1 / ${this.def.phases.length}`, this.phase.en + '  ' + this.phase.name, 160);
      this.audio.sfx('phase');
    }
  }

  updatePlay() {
    const c = this.ctx;
    this.T++;
    this.phaseT++;
    c.T = this.T;
    c.t = this.phaseT;
    // boss movement along the phase path
    if (this.phase.path) {
      const p = this.phase.path(c);
      this.boss.homeX = p.x; this.boss.homeY = p.y;
      this.boss.x += (p.x - this.boss.x) * 0.1;
      this.boss.y += (p.y - this.boss.y) * 0.1;
    }
    this.phase.tick(c);
    if (this.phaseT === 1 && this.phase.cam3d) {
      // entering a depth phase: a short flash, the view itself glides in over ~1 s
      this.fx.flash('#c8f4ff', 0.4);
      this.audio.sfx('warn');
    }
    // tension layer (extra hats, higher arpeggio) for the final 10 seconds of each phase
    const phaseRemain = this.phase.dur * 60 - this.phaseT;
    this.audio.setLayer(phaseRemain < 600 ? 1 : 0);

    if (this.phaseT >= this.phase.dur * 60) {
      if (this.phaseIdx < this.def.phases.length - 1) {
        this.state = 'trans';
        this.transT = 0;
        this.B.cancelAll();
        this.fx.flash('#ffffff', 0.85);
        this.fx.shake(6, 16);
        this.audio.sfx('phase');
        this.boss.setState('transition');
        this.boss.hit(12, 14);
      } else {
        this.startClear();
      }
    }
  }

  updateTrans() {
    this.transT++;
    this.boss.homeX = W / 2; this.boss.homeY = 96;
    this.boss.x += (W / 2 - this.boss.x) * 0.08;
    this.boss.y += (96 - this.boss.y) * 0.08;
    if (this.transT === 60) {
      this.phaseIdx++;
      this.phaseT = 0;
      this.enterPhase();
      this.fx.showBanner(`PHASE ${this.phaseIdx + 1} / ${this.def.phases.length}`, this.phase.en + '  ' + this.phase.name, 170);
      this.audio.setLayer(0);
    }
    if (this.transT >= 120) this.state = 'play';
  }

  startClear() {
    this.state = 'clear';
    this.clearT = 0;
    this.B.cancelAll();
    this.boss.setState('defeat');
    this.audio.setTrack('clear');
    this.audio.sfx('clear');
    this.fx.flash('#fff3c4', 0.9);
    this.fx.showBanner('STAGE CLEAR', this.def.name + ' 耐え切った！', 260);
    // reward: survival bonus
    this.elapsedBonus = Math.round(this.totalFrames / 60) * 10;
    this.score += this.elapsedBonus;
    this.game.stageCleared = true;
  }

  updateClear() {
    this.clearT++;
    if (this.clearT % 40 === 0 && this.clearT < 200) {
      this.fx.burst(this.boss.x + (Math.random() - 0.5) * 120, this.boss.y + (Math.random() - 0.5) * 60, 12, '#ffe27a', 2.2, 36);
    }
    if (this.clearT === 240) this.game.finishStage(this);
  }

  draw(g, t) {
    const [sx, sy] = this.fx.shakeOffset();
    g.save();
    g.translate(sx, sy);
    this.drawBackground(g, t);
    if (this.safe) this.drawSafeZone(g, t);
    this.drawCannons(g, t);
    this.boss.draw(g, this.view);
    this.B.draw(g, this.S, t, this.view);
    this.player.draw(g, this.game.input.focus, this.view);
    this.fx.draw(g, this.view);
    g.restore();
    this.drawHUD(g, t);
  }

  drawBackground(g, t) {
    g.drawImage(this.bg, 0, 0);
    const d = this.def;
    const e = this.view.e;
    // depth floor (cam3d phases) — the flat sea band fades out as the floor takes over
    if (e > 0) this.view.drawFloor(g, d.bg.sea, d.bg.accent);
    // sea band
    g.globalAlpha = 1 - e * 0.85;
    g.fillStyle = d.bg.sea;
    g.fillRect(0, H - 56, W, 56);
    g.fillStyle = d.bg.accent;
    for (let y = H - 52; y < H; y += 8) {
      const off = ((t * 0.5 + y * 3) % 48);
      for (let x = -off; x < W; x += 48) g.fillRect(Math.round(x), y, 16, 1);
    }
    g.globalAlpha = 1;
    // parallax clouds (Pixel Frog background pieces)
    const clouds = this.S.map['cloud_bg'];
    const c1 = clouds[4], c2 = clouds[5], c3 = clouds[6];
    g.globalAlpha = 0.22;
    const cx = (t * 0.15) % (W + 300);
    g.drawImage(c1, Math.round(W - cx + 100), 40, c1.width * 2, c1.height * 2);
    g.globalAlpha = 0.16;
    g.drawImage(c2, Math.round(cx - 260), 110, c2.width * 2, c2.height * 2);
    g.globalAlpha = 0.12;
    g.drawImage(c3, Math.round(W - cx * 1.4), 200, c3.width * 2, c3.height * 2);
    g.globalAlpha = 1;
    if (d.id === 3) {
      g.fillStyle = '#ffffff';
      for (const s of this.cellStars) {
        const a = 0.25 + 0.35 * Math.sin(t * 0.05 + s.p);
        g.globalAlpha = a;
        g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      }
      g.globalAlpha = 1;
    }
  }

  drawSafeZone(g, t) {
    const s = this.safe;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.08);
    // the safe circle is a ground-plane circle: project its centre/radius with the view
    const p = this.view.P(s.x, s.y), rx = s.r * p.s, ry = rx * this.view.squash();
    g.save();
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.beginPath(); g.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.setLineDash([3, 5]);
    g.strokeStyle = `rgba(255,255,255,${0.25 + 0.2 * pulse})`;
    g.lineWidth = 1;
    g.beginPath(); g.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  drawCannons(g, t) {
    const cs = this.def.cannons;
    if (!cs) return;
    cs.forEach((cn, i) => {
      const firing = this.cannonState[i] > 0;
      const frames = firing ? this.S.map['cannon/cannon_fire'] : this.S.map['cannon/cannon_idle'];
      const img = firing ? frames[Math.min(frames.length - 1, Math.floor((20 - this.cannonState[i]) / 4))] : frames[0];
      const w = img.width * SPRITE_SCALE, h = img.height * SPRITE_SCALE;
      g.save();
      g.imageSmoothingEnabled = false;
      g.translate(cn.x, cn.y);
      g.scale(cn.dir, 1);
      g.drawImage(img, -w / 2, -h / 2, w, h);
      g.restore();
    });
  }

  // ----- HUD ---------------------------------------------------------------
  drawHUD(g, t) {
    const d = this.def;
    // top-left: stage + score + graze
    text(g, `STAGE ${d.id}  ${d.name}`, 12, 10, 16, '#e8f6ff');
    text(g, `SCORE ${String(this.score).padStart(7, '0')}`, 12, 30, 16, '#ffe27a');
    text(g, `GRAZE ${String(this.graze).padStart(3, '0')}`, 12, 50, 16, '#c6f5ff');
    if (this.misses === 0 && this.state !== 'intro') text(g, 'NO MISS', 12, 70, 16, '#7fe3b4');

    // top-right: BIG remaining seconds (required)
    const sec = this.state === 'play' || this.state === 'trans' ? this.remainingSec : this.remainingSecFull();
    const warn = sec <= 10 && this.state === 'play';
    const col = warn ? (Math.floor(t / 8) % 2 ? '#ff6b8a' : '#ffd0dc') : '#ffffff';
    text(g, 'REMAIN', W - 12, 10, 16, '#c6d7e8', 'right');
    text(g, String(sec).padStart(3, '0'), W - 12, 26, 48, col, 'right');
    text(g, 'SEC', W - 12, 74, 16, '#c6d7e8', 'right');
    // phase progress bar + segment ticks
    const bw = 170, bx = W - 12 - bw, by = 96;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(bx - 2, by - 2, bw + 4, 8);
    const phaseLeft = this.state === 'play' ? 1 - this.phaseT / (this.phase.dur * 60) : (this.state === 'intro' ? 1 : 0);
    g.fillStyle = warn ? '#ff6b8a' : '#7fe3d0';
    g.fillRect(bx, by, Math.max(0, bw * phaseLeft), 4);
    g.fillStyle = '#ffffff';
    let acc = 0;
    for (let i = 0; i < d.phases.length - 1; i++) {
      acc += d.phases[i].dur * 60;
      g.fillRect(Math.round(bx + bw * (acc / this.totalFrames)), by - 2, 1, 8);
    }
    if (this.state === 'play' || this.state === 'trans') {
      text(g, `PHASE ${this.phaseIdx + 1}/${d.phases.length}  ${this.phase.en}`, W - 12, by + 12, 16, '#c6d7e8', 'right');
    }

    // bottom-left: lives as tiny player icons
    const icon = this.S.map['player/01-idle'][0];
    for (let i = 0; i < this.player.maxLives; i++) {
      g.globalAlpha = i < this.player.lives ? 1 : 0.22;
      g.drawImage(icon, 12 + i * 22, H - 34, icon.width * 0.8, icon.height * 0.8);
    }
    g.globalAlpha = 1;
    // bottom-right: difficulty
    text(g, `${this.diff.name}`, W - 12, H - 22, 16, this.diff.color, 'right');

    // banner
    const b = this.fx.banner;
    if (b) {
      const k = b.t / b.dur;
      const a = Math.min(1, b.t / 12, (b.dur - b.t) / 20);
      g.save();
      g.globalAlpha = Math.max(0, a);
      g.fillStyle = 'rgba(0,0,0,0.42)';
      g.fillRect(0, H / 2 - 40, W, 80);
      text(g, b.title, W / 2, H / 2 - 30, 32, '#ffffff', 'center');
      if (b.sub) text(g, b.sub, W / 2, H / 2 + 8, 16, '#ffe9a8', 'center');
      g.restore();
      void k;
    }
  }

  remainingSecFull() { return Math.ceil(this.totalFrames / 60); }
}

// ---------------------------------------------------------------------------------------------
// Text helper (DotGothic16, pixel-aligned, with 1px drop shadow)
// ---------------------------------------------------------------------------------------------
export function text(g, str, x, y, size, color, align = 'left') {
  g.save();
  g.font = `${size}px DotGothic16, monospace`;
  g.textBaseline = 'top';
  g.textAlign = align;
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillText(str, Math.round(x) + 2, Math.round(y) + 2);
  g.fillStyle = color;
  g.fillText(str, Math.round(x), Math.round(y));
  g.restore();
}

// ---------------------------------------------------------------------------------------------
// Game: screens and progression
// ---------------------------------------------------------------------------------------------
export class Game {
  constructor({ canvas, sprites, audio, input }) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.sprites = sprites;
    this.audio = audio;
    this.input = input;
    this.save = LS.load();
    this.save.clear = this.save.clear || {};
    this.diffKey = this.save.lastDiff || 'normal';
    this.diff = DIFFICULTY[this.diffKey];
    this.screen = 'title';
    this.menuIdx = 0;
    this.selIdx = this.save.lastStage ?? 0;
    this.stageIdx = 0;
    this.run = null;
    this.result = null;
    this.paused = false;
    this.tick = 0;
    this.titleBg = makeBands(W, H, '#1c3f57', '#081823', 18);
    this.clouds = [];
    for (let i = 0; i < 9; i++) this.clouds.push({ x: Math.random() * W, y: 40 + Math.random() * 240, s: 0.2 + Math.random() * 0.4, i: 4 + (i % 3) });
    this.lastMissAt = -999;
    this.stageCleared = false;
  }

  // ----- state helpers -----------------------------------------------------
  inputState() {
    const d = this.input.dir;
    return { dx: d.dx, dy: d.dy, focus: this.input.focus, pointer: this.screen === 'stage' ? this.input.pointer : null };
  }

  persist() { LS.save({ ...this.save, lastDiff: this.diffKey, lastStage: this.selIdx }); }

  unlocked(i) {
    if (i === 0) return true;
    const prev = this.save.clear[STAGES[i - 1].id];
    return !!(prev && Object.keys(prev).length);
  }

  isCleared(stageIdx, diffKey) {
    const rec = this.save.clear[STAGES[stageIdx].id];
    return !!(rec && rec[diffKey]);
  }

  startStage(i) {
    this.stageIdx = i;
    this.selIdx = i;
    this.run = new StageRun(this, STAGES[i]);
    this.screen = 'stage';
    this.paused = false;
    this.persist();
    this.audio.setTrack(STAGES[i].music);
  }

  gameOver() {
    this.audio.sfx('fail');
    this.audio.setTrack(null);
    this.screen = 'gameover';
    this.menuIdx = 0;
    this.run.state = 'dead';
  }

  finishStage(run) {
    const id = STAGES[this.stageIdx].id;
    const nomiss = run.misses === 0;
    const bonus = nomiss ? 3000 : 0;
    const clearBonus = Math.round(5000 * SCORE_MULT[this.diffKey]);
    const score = run.score + bonus + clearBonus;
    const coins = 1 + Math.floor(run.graze / 8) + (nomiss ? 5 : 0);
    this.save.clear[id] = this.save.clear[id] || {};
    const prev = this.save.clear[id][this.diffKey];
    if (!prev || prev.score < score) this.save.clear[id][this.diffKey] = { score, nomiss, graze: run.graze };
    this.result = { stage: STAGES[this.stageIdx], score, graze: run.graze, misses: run.misses, nomiss, coins, bonus, clearBonus, timeBonus: run.elapsedBonus, allClear: this.stageIdx === STAGES.length - 1 };
    this.persist();
    this.screen = 'result';
    this.menuIdx = 0;
    this.run = null;
  }

  // ----- per-tick update ---------------------------------------------------
  update() {
    this.tick++;
    const inp = this.input;
    if (this.screen === 'title') this.updateTitle();
    else if (this.screen === 'select') this.updateSelect();
    else if (this.screen === 'credits') { if (inp.isPressed('Enter', 'Escape', 'Space', 'Backspace', 'KeyZ') || inp.tap) this.screen = 'title'; }
    else if (this.screen === 'stage') this.updateStage();
    else if (this.screen === 'pause') this.updatePause();
    else if (this.screen === 'gameover') this.updateGameOver();
    else if (this.screen === 'result') this.updateResult();
    inp.endTick();
  }

  menuNav(count) {
    const inp = this.input;
    if (inp.isPressed('ArrowUp', 'KeyW')) this.menuIdx = (this.menuIdx + count - 1) % count;
    if (inp.isPressed('ArrowDown', 'KeyS')) this.menuIdx = (this.menuIdx + 1) % count;
  }

  updateTitle() {
    const inp = this.input;
    this.menuNav(2);
    if (inp.isPressed('Enter', 'Space', 'KeyZ') || (inp.tap && inp.tap.y > 200 && inp.tap.y < 330 && inp.tap.x > 0)) {
      this.audio.sfx('confirm');
      if (this.menuIdx === 0) { this.screen = 'select'; this.menuIdx = 0; this.audio.setTrack('title'); }
      else this.screen = 'credits';
    }
    if (inp.isPressed('KeyF')) this.toggleFullscreen();
    this.updateBackdrop();
  }

  updateSelect() {
    const inp = this.input;
    // rows: 0 = difficulty, 1..3 = stages, 4 = back
    const rows = STAGES.length + 2;
    this.menuNav(rows);
    // rows: difficulty at y 96, stages at 140 + i*52, back after the last stage
    const tapRow = inp.tap ? (inp.tap.y < 130 ? 0 : Math.min(rows - 1, Math.floor((inp.tap.y - 130) / 52) + 1)) : null;
    if (inp.isPressed('ArrowLeft', 'KeyA') && this.menuIdx === 0) this.cycleDiff(-1);
    if (inp.isPressed('ArrowRight', 'KeyD') && this.menuIdx === 0) this.cycleDiff(1);
    if (inp.isPressed('Escape', 'Backspace', 'KeyQ')) { this.screen = 'title'; this.menuIdx = 0; this.audio.setTrack('title'); return; }
    if (tapRow !== null && tapRow >= 0 && tapRow < rows) this.menuIdx = tapRow;
    if (inp.isPressed('Enter', 'Space', 'KeyZ') || (inp.tap && tapRow === this.menuIdx)) {
      if (this.menuIdx === 0) this.cycleDiff(1);
      else if (this.menuIdx === rows - 1) { this.screen = 'title'; this.menuIdx = 0; this.audio.setTrack('title'); }
      else {
        const i = this.menuIdx - 1;
        if (this.unlocked(i)) { this.audio.sfx('confirm'); this.startStage(i); }
        else this.audio.sfx('select');
      }
    }
    if (inp.isPressed('KeyF')) this.toggleFullscreen();
    this.updateBackdrop();
  }

  cycleDiff(dir) {
    const i = DIFF_ORDER.indexOf(this.diffKey);
    this.diffKey = DIFF_ORDER[(i + dir + DIFF_ORDER.length) % DIFF_ORDER.length];
    this.diff = DIFFICULTY[this.diffKey];
    this.audio.sfx('select');
    this.persist();
  }

  updateStage() {
    const inp = this.input;
    if (inp.isPressed('Escape', 'KeyP')) { this.screen = 'pause'; this.menuIdx = 0; this.audio.setTrack(null); return; }
    if (inp.isPressed('KeyF')) this.toggleFullscreen();
    const run = this.run;
    if (!run) return;
    run.update();
    // run.update() may have ended the stage (finishStage clears this.run) or the game (gameOver)
    if (!this.run || run.state === 'dead') return;
  }

  // Pause menu: 0 = resume, 1 = retry stage, 2 = stage select
  updatePause() {
    const inp = this.input;
    this.menuNav(3);
    const resume = () => { this.screen = 'stage'; this.audio.setTrack(STAGES[this.stageIdx].music); };
    if (inp.isPressed('Escape', 'KeyP')) { resume(); return; }
    if (inp.isPressed('KeyR')) { this.startStage(this.stageIdx); return; }
    if (inp.isPressed('Enter', 'Space', 'KeyZ')) {
      if (this.menuIdx === 0) resume();
      else if (this.menuIdx === 1) this.startStage(this.stageIdx);
      else { this.screen = 'select'; this.menuIdx = this.stageIdx + 1; this.audio.setTrack('title'); }
    }
  }

  updateGameOver() {
    const inp = this.input;
    this.menuNav(2);
    if (inp.isPressed('KeyR') || ((inp.isPressed('Enter', 'Space', 'KeyZ')) && this.menuIdx === 0)) this.startStage(this.stageIdx);
    if (inp.isPressed('Enter', 'Space', 'KeyZ') && this.menuIdx === 1) { this.screen = 'select'; this.menuIdx = this.stageIdx + 1; this.audio.setTrack('title'); }
    if (inp.isPressed('Escape', 'KeyQ')) { this.screen = 'select'; this.menuIdx = this.stageIdx + 1; this.audio.setTrack('title'); }
  }

  updateResult() {
    const inp = this.input;
    if (inp.isPressed('Enter', 'Space', 'KeyZ') || inp.tap) {
      const next = this.stageIdx + 1;
      this.screen = 'select';
      this.menuIdx = next < STAGES.length ? next + 1 : 0;
      this.selIdx = Math.min(next, STAGES.length - 1);
      this.audio.setTrack('title');
      this.result = null;
    }
  }

  updateBackdrop() {
    for (const c of this.clouds) { c.x -= c.s; if (c.x < -80) { c.x = W + 40; c.y = 40 + Math.random() * 240; } }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }

  // ----- drawing -----------------------------------------------------------
  render() {
    const g = this.g;
    g.imageSmoothingEnabled = false;
    if (this.screen === 'stage' || this.screen === 'pause' || this.screen === 'gameover') {
      if (this.run) this.run.draw(g, this.tick);
      else g.drawImage(this.titleBg, 0, 0);
      // (the stage keeps drawing under pause / game over)
      if (this.screen === 'pause') this.drawPause(g);
      if (this.screen === 'gameover') this.drawGameOver(g);
      return;
    }
    g.drawImage(this.titleBg, 0, 0);
    for (const c of this.clouds) {
      const img = this.sprites.map['cloud_bg'][c.i];
      g.globalAlpha = 0.25;
      g.drawImage(img, Math.round(c.x), Math.round(c.y), img.width * 2, img.height * 2);
    }
    g.globalAlpha = 1;
    if (this.screen === 'title') this.drawTitle(g);
    else if (this.screen === 'select') this.drawSelect(g);
    else if (this.screen === 'credits') this.drawCredits(g);
    else if (this.screen === 'result') this.drawResult(g);
  }

  drawTitle(g) {
    const t = this.tick;
    text(g, '潮騒の耐久弾幕', W / 2, 74, 48, '#ffffff', 'center');
    text(g, 'TIDE SURVIVAL BULLET HELL', W / 2, 136, 16, '#9ff6e4', 'center');
    text(g, '攻撃はしない。避け続けて、時間を耐え切れ。', W / 2, 166, 16, '#d6e8f2', 'center');
    const items = ['START', 'CREDITS'];
    items.forEach((s, i) => {
      const sel = i === this.menuIdx;
      const blink = sel && Math.floor(t / 20) % 2 === 0;
      text(g, (sel ? '> ' : '   ') + s, W / 2, 226 + i * 40, 32, sel ? (blink ? '#fff3b0' : '#ffe27a') : '#8fb0c2', 'center');
    });
    text(g, 'Arrows/WASD: 移動   Shift: 低速   Esc: 一時停止   F: 全画面', W / 2, H - 40, 16, '#9fbed0', 'center');
    text(g, 'Enter で決定', W / 2, H - 22, 16, '#9fbed0', 'center');
  }

  drawSelect(g) {
    text(g, 'STAGE SELECT', W / 2, 26, 32, '#ffffff', 'center');
    const rows = STAGES.length + 2;
    // row 0: difficulty
    const dsel = this.menuIdx === 0;
    text(g, `${dsel ? '>' : ' '} DIFFICULTY  < ${this.diff.name} ${this.diff.jp} >`, 40, 96, 16, dsel ? '#fff3b0' : this.diff.color);
    text(g, this.diff.desc, 40, 116, 16, '#c9dde8');
    STAGES.forEach((s, i) => {
      const y = 140 + i * 52;
      const sel = this.menuIdx === i + 1;
      const open = this.unlocked(i);
      const cleared = this.isCleared(i, this.diffKey);
      const c = !open ? '#5a6d78' : sel ? '#fff3b0' : '#e8f6ff';
      text(g, `${sel ? '>' : ' '} ${String(s.id)}. ${s.name}  ${s.en}`, 40, y, 24, c);
      const mark = cleared ? 'CLEAR' : (open ? 'OPEN' : 'LOCKED');
      text(g, mark, 620, y + 6, 16, cleared ? '#7fe3b4' : open ? '#9ec8ff' : '#5a6d78', 'right');
      text(g, `boss: ${s.boss === 'seashell' ? 'Seashell' : s.boss === 'crabby' ? 'Crabby' : 'Totem Trinity'}   phases: ${s.phases.length}`, 40, y + 28, 16, '#8fb0c2');
    });
    const back = this.menuIdx === rows - 1;
    text(g, `${back ? '>' : ' '} BACK`, 40, 140 + STAGES.length * 52 + 4, 24, back ? '#fff3b0' : '#c9dde8');
    text(g, 'UP/DOWN 選択  LEFT/RIGHT 難易度  Enter 決定  Esc 戻る', W / 2, H - 22, 16, '#9fbed0', 'center');
  }

  drawCredits(g) {
    text(g, 'CREDITS / LICENSE', W / 2, 24, 32, '#ffffff', 'center');
    CREDITS.forEach((line, i) => text(g, '・' + line, 24, 82 + i * 40, 16, '#dbeaf3'));
    text(g, '詳細・ライセンス全文は CREDITS.md を参照', W / 2, H - 30, 16, '#9fbed0', 'center');
    text(g, 'Enter / Esc で戻る', W / 2, H - 14, 16, '#9fbed0', 'center');
  }

  drawResult(g) {
    const r = this.result;
    if (!r) return;
    const w = r.stage;
    text(g, r.allClear ? 'ALL CLEAR' : 'STAGE CLEAR', W / 2, 40, 48, '#fff3b0', 'center');
    text(g, `${w.id}. ${w.name}  ${w.en}   [${this.diff.name}]`, W / 2, 98, 16, '#c9dde8', 'center');
    const rows = [
      ['SURVIVAL BONUS', `${r.timeBonus}`],
      ['CLEAR BONUS', `${r.clearBonus}`],
      ['NO MISS BONUS', r.nomiss ? `${r.bonus}` : '—'],
      ['GRAZE', `${r.graze}`],
      ['MISSES', `${r.misses}`],
      ['SCORE', `${r.score}`],
    ];
    rows.forEach(([k, v], i) => {
      text(g, k, 180, 140 + i * 30, 16, '#c9dde8');
      text(g, v, 460, 140 + i * 30, 16, i === 5 ? '#ffe27a' : '#ffffff', 'right');
    });
    // reward coins
    text(g, 'REWARD', 180, 312, 16, '#c9dde8');
    const coin = this.sprites.map['coin'][0];
    const n = Math.min(r.coins, 16);
    for (let i = 0; i < n; i++) g.drawImage(coin, 260 + i * 20, 308, 16, 16);
    if (r.coins > 16) text(g, `+${r.coins - 16}`, 260 + 16 * 20 + 6, 312, 16, '#ffe27a');
    if (r.nomiss) text(g, 'NO MISS!', W / 2 + 120, 312, 16, '#7fe3b4');
    text(g, 'Enter で選択画面へ', W / 2, H - 30, 16, '#9fbed0', 'center');
  }

  drawPause(g) {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, W, H);
    text(g, 'PAUSE', W / 2, 110, 48, '#ffffff', 'center');
    ['再開', 'リトライ', 'ステージ選択'].forEach((s, i) => {
      text(g, `${i === this.menuIdx ? '> ' : '   '}${s}`, W / 2, 200 + i * 40, 24, i === this.menuIdx ? '#fff3b0' : '#c9dde8', 'center');
    });
    text(g, 'R: リトライ   Esc: 再開', W / 2, H - 30, 16, '#9fbed0', 'center');
  }

  drawGameOver(g) {
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(0, 0, W, H);
    text(g, 'GAME OVER', W / 2, 100, 48, '#ff8fb1', 'center');
    text(g, `${STAGES[this.stageIdx].name}  残り ${this.run ? this.run.remainingSec : '--'} 秒`, W / 2, 170, 16, '#e8f6ff', 'center');
    ['リトライ（R）', 'ステージ選択'].forEach((s, i) => {
      text(g, `${i === this.menuIdx ? '> ' : '   '}${s}`, W / 2, 230 + i * 40, 24, i === this.menuIdx ? '#fff3b0' : '#c9dde8', 'center');
    });
  }
}
