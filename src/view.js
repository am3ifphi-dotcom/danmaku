// Pseudo-3D chase camera for selected phases (visual only).
//
// Gameplay stays 100% on the 2D field (x in 0..640, y in 0..360). Collision, spawning and
// movement never change. Only drawing is projected:
//   * the field is treated as a floor. y increases toward the player (near), decreases away (far);
//   * the camera sits BACK units behind the player (in field depth), so the player stays on screen
//     and moving the ship up/down reads as moving forward/backward in depth;
//   * the camera follows the player with smoothing (lag), so the view glides rather than snaps;
//   * k blends between the flat 2D view (k=0) and the perspective view (k=1) over ~1 s, so a phase
//     start/end is a continuous transition, not a cut.
// Every draw helper below returns the identity mapping when k=0, so 2D phases are unchanged.
import { W, H } from './config.js';

export const BACK = 200;      // camera distance behind the player (field depth units)
export const CAM_H = 250;     // screen px from horizon to the player's ground point (player depth)
export const HORIZON = 40;    // screen y of the horizon
const MIN_D = 8;              // depth clamp for anything at / behind the camera plane
const FLAT = 0.5;             // vertical squash of ground-plane circles in 3D
const BLEND_STEP = 1 / 60;    // k changes by this per frame (≈1 s to fully switch)

// In 3D phases the ship may not go further back than this field y, so it never passes the boss
// (a boss between the ship and the camera would turn into a giant foreground sprite).
export const DEPTH_MIN_Y = 170;
export const FLAT_MIN_Y = 44;

export const smooth = k => k * k * (3 - 2 * k);
export const lerp = (a, b, t) => a + (b - a) * t;

export class View {
  constructor() {
    this.k = 0;        // linear blend 0..1
    this.camZ = null;  // camera position along the depth axis (smoothed)
    this.scroll = 0;   // floor scroll (forward motion), only advances while 3D is on
  }

  get e() { return smooth(this.k); }
  get on() { return this.k > 0; }

  // Call once per frame. playerY: the player's field y. want3d: the current phase requests 3D.
  update(playerY, want3d) {
    const target = (H - playerY) - BACK;
    if (this.camZ === null) this.camZ = target;
    this.camZ += (target - this.camZ) * 0.12; // smooth follow
    const goal = want3d ? 1 : 0;
    this.k = Math.min(1, Math.max(0, this.k + Math.sign(goal - this.k) * BLEND_STEP));
    if (this.k > 0) this.scroll += 1.6 * this.e;
  }

  // Pure perspective projection of a field point onto the screen (ground plane).
  project(x, y) {
    let d = (H - y) - this.camZ;
    if (d < MIN_D) d = MIN_D;
    const s = BACK / d;
    return { x: W / 2 + (x - W / 2) * s, y: HORIZON + CAM_H * s, s, d };
  }

  // Blended point: field position at k=0, perspective position at k=1. s is the draw scale.
  P(x, y) {
    const e = this.e;
    if (e <= 0) return { x, y, s: 1 };
    const p = this.project(x, y);
    return { x: lerp(x, p.x, e), y: lerp(y, p.y, e), s: lerp(1, p.s, e) };
  }

  // Vertical squash for ground-plane circles (rings, safe zone).
  squash() { return lerp(1, FLAT, this.e); }

  // Floor: horizon glow, scrolling cross lines (moving toward the camera) and lane lines.
  drawFloor(g, base, line) {
    const e = this.e;
    if (e <= 0) return;
    g.save();
    // floor fill below the horizon
    g.globalAlpha = 0.55 * e;
    g.fillStyle = base;
    g.fillRect(0, HORIZON, W, H - HORIZON);
    // horizon glow
    g.globalAlpha = 0.5 * e;
    g.fillStyle = line;
    g.fillRect(0, HORIZON, W, 1);
    // cross lines: constant field y, so each is a horizontal screen line that gets denser toward the bottom
    g.strokeStyle = line;
    g.lineWidth = 1;
    const STEP = 34, span = H + 200;
    const off = this.scroll % STEP;
    for (let z = STEP - off; z < span; z += STEP) {
      const y = H - z;
      if (y < -60 || y > H + 60) continue;
      const p = this.P(0, y);
      if (p.y < HORIZON + 1 || p.y > H) continue;
      g.globalAlpha = Math.min(0.5, 0.12 + 0.45 * p.s) * e;
      const a = this.P(-400, y), b = this.P(W + 400, y);
      g.beginPath(); g.moveTo(a.x, p.y); g.lineTo(b.x, p.y); g.stroke();
    }
    // lane lines: converge toward the vanishing point at the horizon
    const yNear = Math.min(H, H - this.camZ - MIN_D);
    for (let x = 0; x <= W; x += 80) {
      const a = this.P(x, -40), b = this.P(x, yNear);
      g.globalAlpha = 0.22 * e;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    g.restore();
  }
}

// Shared identity view (k=0) used when a draw call does not receive a view.
export const FLAT_VIEW = new View();
