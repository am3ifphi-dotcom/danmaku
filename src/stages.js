// Stage and phase scripts.
// Each phase: { name, en, dur (seconds), path(c)->{x,y} (optional), enter(c), tick(c), safe(c) (optional) }
// `c` is the phase context built in game.js: t (frames in phase), T (frames in stage), sp/cnt/ivl/hom/gap
// (difficulty multipliers), B (bullets), boss, player, fx, audio, S (sprites), s (phase store), and helpers.
import { W, H } from './config.js';
import { ring, fire, fan, wall, every, windupAt, bossFire, aimAt, TAU } from './patterns.js';

// ---------------------------------------------------------------------------
// STAGE 1 — 珊瑚礁の入り江 (Coral Cove). Boss: Seashell. Theme: pearls, rings, spirals, walls.
// ---------------------------------------------------------------------------
const stage1 = {
  id: 1,
  name: '珊瑚礁の入り江',
  en: 'Coral Cove',
  boss: 'seashell',
  bullet: 'pearl',
  bg: { top: '#2b7180', bottom: '#0b2231', accent: '#7fe3d0', sea: '#1d5566' },
  music: 'seashell',
  phases: [
    {
      name: '潮の輪', en: 'TIDE RINGS', dur: 30,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.008) * 110, y: 122 + Math.sin(c.T * 0.02) * 5 }),
      tick(c) {
        const bx = c.boss.x, by = c.boss.y + 10;
        if (windupAt(c, 150)) { c.boss.setState('windup'); c.fx.warnRing(bx, by, 44, 26); }
        if (every(c, 150)) {
          c.s.n = (c.s.n || 0) + 1;
          bossFire(c, bx, by, 44);
          // one moving gap per ring: the safe route rotates ring to ring
          ring(c, bx, by, Math.round(22 * c.cnt), 1.15, { sprite: c.S.bullet, gapCenter: c.s.n * 1.1, gapHalf: 0.55 * c.gap });
        }
        if (every(c, 360)) fan(c, bx, by, 5, 0.8, 1.0, { curve: 0.004 });
      },
    },
    {
      name: '螺旋の貝殻', en: 'SHELL SPIRAL', dur: 30,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.005) * 60, y: 120 }),
      tick(c) {
        const cyc = Math.round(300 * c.ivl);
        const k = c.t % cyc;
        const bx = c.boss.x, by = c.boss.y + 10;
        if (k === cyc - 26 && c.t > 0) { c.boss.setState('windup'); c.fx.warnRing(bx, by, 40, 24); }
        if (k === 0 && c.t > 0) bossFire(c, bx, by, 40);
        // three-arm spiral that is active for 2/3 of each cycle, then breathes
        if (k < Math.round(200 * c.ivl) && c.t % Math.max(1, Math.round(6 * c.ivl)) === 0) {
          const a = c.t * 0.03;
          for (let i = 0; i < 3; i++) fire(c, bx, by, a + i * TAU / 3, 1.05, { sprite: c.S.bullet });
        }
        if (every(c, 240)) {
          // gently homing pearls, slow to start so they can be read
          fan(c, bx, by, 3, 0.5, 0.9, { homing: 0.012, homeDelay: 70 });
        }
      },
    },
    {
      name: '大潮の壁', en: 'GREAT TIDE WALL', dur: 30,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.01) * 110, y: 120 }),
      tick(c) {
        const bx = c.boss.x, by = c.boss.y + 10;
        if (every(c, 150)) {
          c.s.w = (c.s.w || 0) + 1;
          const gapX = W / 2 + Math.sin(c.s.w * 1.7) * (W / 2 - 110);
          c.fx.warnBar(6, 0, W, 40, '#ffe7a8');
          wall(c, -8, gapX, 104, 0.78, { sprite: c.S.bullet });
        }
        if (every(c, 330)) {
          // zig-zag pearls: turn once after a fixed distance
          c.s.z = (c.s.z || 0) + 1;
          c.boss.setState('attack');
          const sign = c.s.z % 2 ? 1 : -1;
          for (let i = 0; i < 5; i++) fire(c, bx, by, Math.PI / 2 + (i - 2) * 0.22, 1.1, { turnDist: 110, turnAng: sign * 1.25, sprite: c.S.bullet });
        }
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// STAGE 2 — 燃える砲台群 (Burning Battery). Boss: Crabby (cannons on the side walls).
// Theme: rotating lasers, opening/closing gates, bouncing cannonballs, chain bursts.
// ---------------------------------------------------------------------------
const stage2 = {
  id: 2,
  name: '燃える砲台群',
  en: 'Burning Battery',
  boss: 'crabby',
  bullet: 'cannon',
  bg: { top: '#d4623f', bottom: '#2a0f22', accent: '#ffb35c', sea: '#5a1d2e' },
  music: 'cannon',
  cannons: [{ x: 34, y: 196, dir: 1 }, { x: W - 34, y: 196, dir: -1 }],
  phases: [
    {
      name: '回転する光条', en: 'SPINNING BEAMS', dur: 35,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.011) * 170, y: 92 + Math.sin(c.T * 0.03) * 5 }),
      tick(c) {
        if (every(c, 420)) {
          c.s.pair = (c.s.pair || 0) + 1;
          const om = (c.s.pair % 2 ? 1 : -1) * 0.0042;   // rad/frame; full turn ~25 s
          const base = c.s.pair * 0.5;
          c.B.addLaser({ follow: c.boss, ang: base, omega: om, warn: 80, active: 300, thick: 7, color: 'red' });
          c.B.addLaser({ follow: c.boss, ang: base + Math.PI / 2, omega: om, warn: 80, active: 300, thick: 7, color: 'red' });
          c.boss.setState('attack');
          c.audio.sfx('warn');
        }
        // both cannons fire aimed cannonballs; the left one fires on alternate cycles
        if (every(c, 110)) {
          c.cannonShot(0, 1.2, { spread: 0.08 });
          if (Math.floor(c.t / 110) % 2 === 0) c.cannonShot(1, 1.2, { spread: 0.08 });
        }
      },
    },
    {
      name: '門の開閉', en: 'OPENING GATES', dur: 35,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.009) * 150, y: 96 }),
      tick(c) {
        const bx = c.boss.x, by = c.boss.y + 12;
        if (windupAt(c, 200)) { c.boss.setState('windup'); c.fx.warnRing(bx, by, 58, 26); }
        if (every(c, 200)) {
          c.s.g = (c.s.g || 0) + 1;
          const open = 0.5 + 0.5 * Math.sin(c.t * 0.02);     // the gate opens and closes over time
          const gapHalf = (0.42 + 0.7 * open) * c.gap;
          const aim = aimAt(c.boss, c.player);
          const gapC = aim + (c.s.g % 2 ? 1.1 : -1.1);
          bossFire(c, bx, by, 58);
          ring(c, bx, by, Math.round(30 * c.cnt), 1.1, { color: 'red', gapCenter: gapC, gapHalf });
        }
        if (every(c, 300)) c.cannonShot(0, 0.9, { homing: 0.011, homeDelay: 60 });
      },
    },
    {
      name: '反射する砲弾', en: 'BOUNCING SHOT', dur: 35,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.007) * 110, y: 100 }),
      tick(c) {
        const bx = c.boss.x, by = c.boss.y + 12;
        if (every(c, 150)) {
          c.cannonShot(0, 1.05, { angle: 0.95, bounces: 3 });
          c.cannonShot(1, 1.05, { angle: Math.PI - 0.95, bounces: 3 });
        }
        if (windupAt(c, 320)) { c.boss.setState('windup'); c.fx.warnRing(bx, by, 30, 24); }
        if (every(c, 320)) {
          bossFire(c, bx, by, 30);
          for (let w = 0; w < 3; w++) {
            ring(c, bx, by, Math.round(8 * c.cnt), 1.0, { delay: w * 14, offset: w * 0.3 + c.s.k * 0.2, color: 'pink' });
          }
          c.s.k = (c.s.k || 0) + 1;
        }
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// STAGE 3 — 嵐の大渦 (Maelstrom). Boss: Totem Trinity (three heads).
// Theme: symmetric patterns, chain bursts, turning bullets, and a final dense slow spiral
// around a permanently safe centre.
// ---------------------------------------------------------------------------
const heads = c => [
  { x: c.boss.x, y: c.boss.y + 10 },
  { x: c.boss.x - 96, y: c.boss.y + 18 },
  { x: c.boss.x + 96, y: c.boss.y + 18 },
];

const stage3 = {
  id: 3,
  name: '嵐の大渦',
  en: 'Maelstrom',
  boss: 'totem',
  bullet: 'orb',
  bg: { top: '#4a3b8a', bottom: '#0a0820', accent: '#c9a8ff', sea: '#1d1446' },
  music: 'totem',
  phases: [
    {
      name: '対称の祭壇', en: 'SYMMETRY ALTAR', dur: 35,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.006) * 120, y: 92 }),
      tick(c) {
        const [mid, left, right] = heads(c);
        if (every(c, 120)) {
          c.s.r = (c.s.r || 0) + 1;
          bossFire(c, mid.x, mid.y, 30);
          ring(c, mid.x, mid.y, Math.round(6 * c.cnt), 0.95, { offset: c.s.r * 0.23, color: 'gold' });
        }
        if (windupAt(c, 180)) { c.boss.setState('windup'); }
        if (every(c, 180)) {
          // mirrored fans from both side heads, aimed straight down
          for (const h of [left, right]) {
            for (let k = -2; k <= 2; k++) fire(c, h.x, h.y, Math.PI / 2 + k * 0.2, 1.0, { color: 'teal' });
          }
        }
      },
    },
    {
      name: '時間差の連鎖', en: 'CHAIN DELAY', dur: 35,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.008) * 90, y: 96 }),
      tick(c) {
        const [mid, left, right] = heads(c);
        if (windupAt(c, 210)) { c.boss.setState('windup'); c.fx.warnRing(mid.x, mid.y, 36, 24); }
        if (every(c, 210)) {
          bossFire(c, mid.x, mid.y, 36);
          for (let w = 0; w < 6; w++) {
            ring(c, mid.x, mid.y, Math.round(9 * c.cnt), 1.0, {
              delay: w * 12, offset: w * 0.25, gapCenter: Math.PI / 2 + (w % 2 ? 0.9 : -0.9), gapHalf: 0.5 * c.gap, color: 'violet',
            });
          }
        }
        if (every(c, 100)) {
          c.s.sd = (c.s.sd || 0) ^ 1;
          const h = c.s.sd ? right : left;
          fan(c, h.x, h.y, 3, 0.35, 1.05, { homing: 0.006, homeDelay: 130, color: 'pink' });
        }
      },
    },
    {
      name: '渦を曲がる弾', en: 'TURNING STORM', dur: 35,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.009) * 130, y: 92 }),
      tick(c) {
        const [, left, right] = heads(c);
        if (every(c, 150)) {
          for (const h of [left, right]) {
            c.s.tn = (c.s.tn || 0) + 1;
            const sign = c.s.tn % 2 ? 1 : -1;
            const base = aimAt(h, c.player);
            for (let i = 0; i < 9; i++) {
              const a = base + (i / 8 - 0.5) * 1.2;
              fire(c, h.x, h.y, a, 1.1, { turnDist: 100, turnAng: sign * 1.15, color: 'gold' });
            }
          }
          c.boss.setState('attack');
        }
        if (every(c, 330)) {
          c.s.wg = (c.s.wg || 0) + 1;
          const gapX = W / 2 + Math.sin(c.s.wg * 2.1) * (W / 2 - 120);
          c.fx.warnBar(6, 0, W, 40, '#e5d3ff');
          wall(c, -8, gapX, 110, 0.8, { color: 'red' });
        }
      },
    },
    {
      name: '最終：中心の大螺旋', en: 'FINAL: GREAT VORTEX', dur: 40,
      path: c => ({ x: W / 2 + Math.sin(c.T * 0.01) * 60, y: 92 }),
      safe: () => ({ x: W / 2, y: H / 2, r: 62 }),
      tick(c) {
        const bx = c.boss.x, by = c.boss.y + 10;
        // inward-curving orbit bullets (they die inside the safe circle)
        if (every(c, 80)) {
          for (let k = 0; k < 6; k++) {
            const th = c.t * 0.02 + (k * TAU) / 6;
            const sx = W / 2 + Math.cos(th) * 230, sy = H / 2 + Math.sin(th) * 120;
            fire(c, sx, sy, th + Math.PI / 2, 0.85, { curve: 0.009, color: 'violet' });
          }
        }
        // slow, dense rings with a rotating gap
        if (windupAt(c, 50)) c.boss.setState('windup');
        if (every(c, 50)) {
          bossFire(c, bx, by, 30);
          ring(c, bx, by, Math.round(26 * c.cnt), 0.7, { gapCenter: c.t * 0.04, gapHalf: 0.5 * c.gap, color: 'pink' });
        }
        // last 10 seconds: a second, denser layer (still slow, still gapped)
        if (c.t > 30 * 60 && every(c, 24)) {
          c.s.last = (c.s.last || 0) + 1;
          ring(c, bx, by, Math.round(18 * c.cnt), 0.62, { offset: c.s.last * 0.4, gapCenter: -c.t * 0.035, gapHalf: 0.55 * c.gap, color: 'white' });
        }
      },
    },
  ],
};

export const STAGES = [stage1, stage2, stage3];

// Cannon helpers used by stage 2 (and reused by others)
export function cannonFireAt(c, side, angle, speed, opts = {}) {
  const cn = c.cannons[side];
  if (!cn) return;
  c.cannonState[side] = 20;
  const x = cn.x + cn.dir * 14, y = cn.y - 2;
  c.audio.sfx('shot', -3);
  return fire(c, x, y, angle, speed, { sprite: c.S.cannonBall, r: 4, ...opts });
}

export function cannonAim(c, side, speed, opts = {}) {
  const cn = c.cannons[side];
  if (!cn) return;
  // small aimed spread, derived from the frame counter so every run is reproducible (fair to replay)
  const jitter = (((Math.sin(c.T * 12.9898 + side * 78.233) * 43758.5453) % 1) + 1) % 1 - 0.5;
  const a = aimAt({ x: cn.x, y: cn.y }, c.player) + (opts.spread ? jitter * opts.spread : 0);
  return cannonFireAt(c, side, a, speed, opts);
}
