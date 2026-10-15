// Visual effects: warning rings / bars (telegraphs), particles, sprite-animation effects,
// screen flash and shake, and centred banner text. All effects are kept deliberately small
// (pixel squares, few particles) so they never hide bullets.
import { FLAT_VIEW } from './view.js';
import { W, H } from './config.js';

export class FX {
  constructor(sprites) {
    this.S = sprites;
    this.rings = [];      // telegraph circles
    this.bars = [];       // telegraph lines (for walls)
    this.parts = [];      // particles
    this.anims = [];      // sprite animations at a position
    this.flashA = 0;
    this.flashColor = '#ffffff';
    this.shakeT = 0;
    this.shakeMag = 0;
    this.banner = null;   // {title, sub, t, dur}
  }

  warnRing(x, y, r, dur, color = '#ffd6e0') { this.rings.push({ x, y, r0: r * 0.2, r1: r, t: 0, dur, color }); }
  warnBar(y, x0, x1, dur, color = '#ffd6e0') { this.bars.push({ y, x0, x1, t: 0, dur, color }); }

  burst(x, y, n, color, speed = 1.6, life = 26) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color });
    }
  }

  anim(frames, x, y, fps = 12, scale = 2) {
    if (!frames || !frames.length) return;
    this.anims.push({ frames, x, y, t: 0, fps, scale });
  }

  flash(color = '#ffffff', a = 0.8) { this.flashColor = color; this.flashA = a; }
  shake(mag = 6, t = 14) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, t); }

  showBanner(title, sub = '', dur = 150) { this.banner = { title, sub, t: 0, dur }; }

  update() {
    for (const r of this.rings) r.t++;
    this.rings = this.rings.filter(r => r.t < r.dur);
    for (const b of this.bars) b.t++;
    this.bars = this.bars.filter(b => b.t < b.dur);
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life--; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const a of this.anims) a.t++;
    this.anims = this.anims.filter(a => a.t * a.fps / 60 < a.frames.length);
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - 0.04);
    if (this.shakeT > 0) { this.shakeT--; if (this.shakeT === 0) this.shakeMag = 0; }
    if (this.banner) { this.banner.t++; if (this.banner.t >= this.banner.dur) this.banner = null; }
  }

  shakeOffset() {
    if (this.shakeT <= 0) return [0, 0];
    const m = this.shakeMag * (this.shakeT / 14);
    return [(Math.random() - 0.5) * 2 * m, (Math.random() - 0.5) * 2 * m];
  }

  // drawn above bullets
  draw(g, view = FLAT_VIEW) {
    const sq = view.squash();
    for (const r of this.rings) {
      const k = r.t / r.dur;
      const rad = r.r0 + (r.r1 - r.r0) * k;
      const p = view.P(r.x, r.y);
      g.save();
      g.globalAlpha = (1 - k) * 0.9;
      g.strokeStyle = r.color;
      g.lineWidth = 1;
      g.setLineDash([4, 4]);
      g.beginPath(); g.ellipse(p.x, p.y, rad * p.s, rad * p.s * sq, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    for (const b of this.bars) {
      const k = b.t / b.dur;
      const p0 = view.P(b.x0, b.y), p1 = view.P(b.x1, b.y);
      g.save();
      g.globalAlpha = (0.35 + 0.35 * Math.sin(b.t * 0.6)) * (1 - k * 0.5);
      g.fillStyle = b.color;
      g.fillRect(p0.x, p0.y - 1, p1.x - p0.x, 2);
      g.restore();
    }
    for (const p of this.parts) {
      const q = view.P(p.x, p.y);
      g.globalAlpha = Math.max(0, p.life / p.max);
      g.fillStyle = p.color;
      g.fillRect(Math.round(q.x), Math.round(q.y), 2 * q.s, 2 * q.s);
    }
    g.globalAlpha = 1;
    for (const a of this.anims) {
      const idx = Math.min(a.frames.length - 1, Math.floor(a.t * a.fps / 60));
      const img = a.frames[idx];
      const q = view.P(a.x, a.y);
      const w = img.width * a.scale * q.s, h = img.height * a.scale * q.s;
      g.imageSmoothingEnabled = false;
      g.drawImage(img, Math.round(q.x - w / 2), Math.round(q.y - h / 2), w, h);
    }
    if (this.flashA > 0) {
      g.globalAlpha = this.flashA;
      g.fillStyle = this.flashColor;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
  }
}
