// Reusable bullet-pattern helpers. Every helper takes the phase context `c` (see game.js)
// and speeds are in px/frame at NORMAL difficulty; `c.sp` applies the difficulty multiplier.
import { W, H, MIN_GAP_RAD, MIN_GAP_PX } from './config.js';

export const TAU = Math.PI * 2;

export function angDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}

export function aimAt(from, to) { return Math.atan2(to.y - from.y, to.x - from.x); }

// Circular burst with an optional gap (the gap is the only safe route through the ring).
export function ring(c, x, y, n, speed, o = {}) {
  const off = o.offset || 0;
  const gapHalf = o.gapCenter === undefined || o.gapCenter === null ? 0 : Math.max(MIN_GAP_RAD, o.gapHalf || 0);
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * TAU;
    if (gapHalf && angDiff(a, o.gapCenter) < gapHalf) continue;
    fire(c, x, y, a, speed, o);
  }
}

// Fire one bullet with angle a and speed (px/frame, pre-multiplied by difficulty).
export function fire(c, x, y, a, speed, o = {}) {
  const sp = speed * c.sp;
  return c.B.add({
    x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
    sprite: o.sprite ?? c.S.bullet, color: o.color || 'teal', r: o.r ?? 3,
    delay: o.delay || 0, homing: (o.homing || 0) * c.hom, homeDelay: o.homeDelay,
    turnDist: o.turnDist, turnAng: o.turnAng, bounces: o.bounces, curve: o.curve,
    safe: o.safe ?? c.safe ?? null,
  });
}

// Aimed fan at the player.
export function fan(c, x, y, n, spread, speed, o = {}) {
  const base = aimAt({ x, y }, c.player);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    fire(c, x, y, base + t * spread, speed, o);
  }
}

// Horizontal wall of bullets falling from the top with one moving gap.
export function wall(c, y, gapX, gapW, speed, o = {}) {
  const gw = Math.max(MIN_GAP_PX, gapW * c.gap);
  const spacing = o.spacing || 20;
  for (let x = -6; x <= W + 6; x += spacing) {
    if (Math.abs(x - gapX) < gw / 2) continue;
    c.B.add({ x, y, vx: 0, vy: speed * c.sp, sprite: o.sprite ?? c.S.bullet, color: o.color || 'teal', r: 3 });
  }
}

// Pattern-to-difficulty helpers
export function gapFor(c, half) { return Math.max(MIN_GAP_RAD, half * c.gap); }
export function tick(c, period, phaseOffset = 0) { return c.t >= 60 && (c.t - phaseOffset) % Math.max(1, Math.round(period * c.ivl)) === 0; }
export function every(c, frames) { return c.t > 0 && c.t % Math.max(1, Math.round(frames * c.ivl)) === 0; }
export function windupAt(c, frames) {
  // true exactly `lead` frames before an emission (used to show the boss wind-up and a warning ring)
  return c.t > 0 && c.t % Math.max(1, Math.round(frames * c.ivl)) === Math.round(frames * c.ivl) - 26;
}

export function bossFire(c, x, y, r = 40) {
  c.boss.setState('attack');
  c.fx.warnRing(x, y, r, 14);
  c.audio.sfx('shot');
}
