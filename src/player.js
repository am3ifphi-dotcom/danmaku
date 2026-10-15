// Player: Captain Clown Nose (Pixel Frog, CC0). Never attacks — dodging only.
// Small hit circle (2.5px) and a larger graze circle (14px). Focus (Shift) halves speed.
import { W, H, SPRITE_SCALE, PLAYER_ALPHA } from './config.js';
import { FLAT_VIEW } from './view.js';

export class Player {
  constructor(sprites, diff) {
    this.S = sprites;
    this.diff = diff;
    this.x = W / 2;
    this.y = H - 56;
    this.hit = 2.5;
    this.graze = 14;
    this.lives = diff.lives;
    this.maxLives = diff.lives;
    this.invuln = 0;       // frames of invincibility
    this.down = 0;         // frames of the "knocked out" animation (no control)
    this.hitAnim = 0;      // frames of hit animation
    this.facing = 1;
    this.moving = false;
    this.clock = 0;
  }

  // input: { dx, dy, focus, pointer: {x,y}|null }
  update(input) {
    this.clock++;
    if (this.invuln > 0) this.invuln--;
    if (this.hitAnim > 0) this.hitAnim--;
    if (this.down > 0) {
      this.down--;
      if (this.down === 0) this.invuln = Math.round(this.diff.invuln * 60);
      return;
    }
    const focus = input.focus;
    const sp = focus ? 1.6 : 3.6;
    let dx = input.dx, dy = input.dy;
    if (input.pointer) {
      // touch / mouse drag: move smoothly towards the pointer (kept slightly above the finger)
      const tx = input.pointer.x, ty = input.pointer.y - 26;
      const ex = tx - this.x, ey = ty - this.y;
      const d = Math.hypot(ex, ey);
      if (d > 1) {
        const m = Math.min(d, sp * 1.25);
        dx = (ex / d) * (m / sp);
        dy = (ey / d) * (m / sp);
      }
    }
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    this.moving = len > 0.05;
    this.x += dx * sp;
    this.y += dy * sp;
    if (Math.abs(dx) > 0.1) this.facing = dx < 0 ? -1 : 1;
    this.x = Math.max(16, Math.min(W - 16, this.x));
    this.y = Math.max(44, Math.min(H - 20, this.y));
  }

  // Called when the player is hit (lives already decremented by the caller).
  knockOut() {
    this.down = 56;
    this.hitAnim = 56;
  }

  draw(g, focus, view = FLAT_VIEW) {
    let img;
    const frames = (key) => this.S.frames(key);
    if (this.down > 0) {
      const f = frames('player/07-dead_hit');
      img = f.length ? f[Math.min(f.length - 1, Math.floor((56 - this.down) / 8))] : null;
    } else if (this.hitAnim > 0) {
      const f = frames('player/06-hit');
      img = f.length ? f[Math.min(f.length - 1, Math.floor((56 - this.hitAnim) / 8))] : null;
    } else if (this.moving) {
      const f = frames('player/02-run');
      img = f.length ? f[Math.floor(this.clock / 6) % f.length] : null;
    } else {
      const f = frames('player/01-idle');
      img = f.length ? f[Math.floor(this.clock / 10) % f.length] : null;
    }
    if (!img) return;
    // blink while invincible
    if (this.invuln > 0 && this.down === 0 && Math.floor(this.invuln / 4) % 2 === 0) return;
    const w = img.width * SPRITE_SCALE, h = img.height * SPRITE_SCALE;
    // the camera follows the ship, so its draw scale is the perspective scale at its depth (1 when flat)
    const p = view.P(this.x, this.y);
    const s = p.s;
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(Math.round(p.x), Math.round(p.y));
    g.scale(this.facing * s, s);
    g.globalAlpha = PLAYER_ALPHA;
    g.drawImage(img, Math.round(-w / 2), Math.round(-h / 2) - 4, w, h);
    g.restore();
    // hitbox dot (always visible but tiny; ring when focused so the player can see it)
    const hr = Math.max(1.5, this.hit * s), gr = this.graze * s;
    g.save();
    g.fillStyle = '#101820';
    g.beginPath(); g.arc(p.x, p.y, hr + 1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(p.x, p.y, hr, 0, Math.PI * 2); g.fill();
    if (focus) {
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 1;
      g.beginPath(); g.arc(p.x, p.y, gr, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }
}
