// Bullet engine: straight / homing / turn-at-distance / edge-bounce / curved (orbit) / delayed bullets,
// rotating lasers, safe-zone killing, collision and graze detection.
import { FLAT_VIEW, lerp } from './view.js';
import { W, H } from './config.js';

// Bullet options (all optional except x, y, vx, vy):
//   sprite     : image/canvas to draw (default orb)
//   r          : hit radius (px)
//   delay      : frames before the bullet starts moving (shows a spawn indicator)
//   homing     : max turn rate (rad/frame) toward the player after homeDelay frames
//   turnDist   : travelled distance (px) after which the velocity is rotated by turnAng once
//   bounces    : number of times the bullet reflects off the left/right/top edges
//   curve      : rotation of the velocity per frame (rad) — makes arcs and orbits
//   safe       : {x,y,r} — bullet dies when it enters this circle (safe-zone patterns)
export class Bullets {
  constructor() {
    this.list = [];
    this.lasers = [];
    this.cap = 1100;
    this.onHit = () => {};
    this.onGraze = () => {};
    this.onCancel = () => {};   // called for bullets removed by a cancel (for FX)
  }

  add(o) {
    if (this.list.length >= this.cap) this.list.shift(); // drop oldest if we ever hit the cap
    const b = {
      x: o.x, y: o.y, vx: o.vx, vy: o.vy, r: o.r ?? 3,
      sprite: o.sprite, color: o.color || 'teal', kind: o.kind || 'orb',
      delay: o.delay || 0, age: 0,
      homing: o.homing || 0, homeDelay: o.homeDelay ?? 60,
      turnDist: o.turnDist || 0, turnAng: o.turnAng || 0, dist: 0, turned: false,
      bounces: o.bounces || 0, curve: o.curve || 0,
      safe: o.safe || null,
      grazed: false, alive: true, fade: 0,
    };
    this.list.push(b);
    return b;
  }

  addLaser(o) {
    const l = {
      x: o.x, y: o.y, ang: o.ang, omega: o.omega || 0, len: o.len || 600,
      thick: o.thick || 8, warn: o.warn ?? 90, active: o.active ?? 180,
      age: 0, follow: o.follow || null, color: o.color || 'red', grazed: false, alive: true,
    };
    this.lasers.push(l);
    return l;
  }

  clearAll(withFx = true) {
    if (withFx) for (const b of this.list) if (b.alive && b.delay <= 0) this.onCancel(b);
    this.list.length = 0;
    this.lasers.length = 0;
  }

  // Remove bullets with a visual fade-out and convert them to cancel effects.
  cancelAll() {
    for (const b of this.list) if (b.alive && b.delay <= 0 && !b.fade) { b.fade = 1; this.onCancel(b); }
    // lasers in their warning phase must go too, otherwise they would fire in the next phase
    for (const l of this.lasers) l.alive = false;
    this.lasers.length = 0;
  }

  update(player, canHit) {
    const { list } = this;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.fade) {
        b.fade++;
        if (b.fade > 14) continue;
        list[w++] = b; continue;
      }
      if (b.delay > 0) { b.delay--; list[w++] = b; continue; }
      b.age++;
      // curved trajectories
      if (b.curve) {
        const c = Math.cos(b.curve), s = Math.sin(b.curve);
        const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c;
        b.vx = vx; b.vy = vy;
      }
      // delayed homing
      if (b.homing && b.age > b.homeDelay) {
        const want = Math.atan2(player.y - b.y, player.x - b.x);
        const cur = Math.atan2(b.vy, b.vx);
        let d = want - cur;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        const t = Math.max(-b.homing, Math.min(b.homing, d));
        const sp = Math.hypot(b.vx, b.vy);
        const na = cur + t;
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
      // turn after a distance
      const sp = Math.hypot(b.vx, b.vy);
      if (b.turnDist && !b.turned) {
        b.dist += sp;
        if (b.dist >= b.turnDist) {
          b.turned = true;
          const na = Math.atan2(b.vy, b.vx) + b.turnAng;
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      b.x += b.vx; b.y += b.vy;
      // edge reflection
      if (b.bounces > 0) {
        if (b.x < 0 && b.vx < 0) { b.vx = -b.vx; b.x = 0; b.bounces--; }
        else if (b.x > W && b.vx > 0) { b.vx = -b.vx; b.x = W; b.bounces--; }
        if (b.y < 0 && b.vy < 0) { b.vy = -b.vy; b.y = 0; b.bounces--; }
      }
      // off-screen / safe-zone removal
      if (b.x < -24 || b.x > W + 24 || b.y < -24 || b.y > H + 24) continue;
      if (b.safe) {
        const dx = b.x - b.safe.x, dy = b.y - b.safe.y;
        if (dx * dx + dy * dy < b.safe.r * b.safe.r) { b.fade = 1; this.onCancel(b); list[w++] = b; continue; }
      }
      // collision with the player
      if (canHit) {
        const dx = b.x - player.x, dy = b.y - player.y;
        const d2 = dx * dx + dy * dy;
        const rr = b.r + player.hit;
        if (d2 < rr * rr) { this.onHit(b); }
        else if (!b.grazed) {
          const gr = b.r + player.graze;
          if (d2 < gr * gr) { b.grazed = true; this.onGraze(b); }
        }
      }
      list[w++] = b;
    }
    list.length = w;

    // lasers
    const ls = this.lasers;
    let lw = 0;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      if (!l.alive) continue;
      l.age++;
      if (l.follow) { l.x = l.follow.x; l.y = l.follow.y; }
      l.ang += l.omega;
      if (l.age > l.warn + l.active) continue;
      if (canHit && l.age > l.warn) {
        const dist = pointToLine(player.x, player.y, l.x, l.y, l.ang);
        if (dist < l.thick / 2 + player.hit) this.onHit(l);
        else if (!l.grazed && dist < l.thick / 2 + player.graze) { l.grazed = true; this.onGraze(l); }
      }
      ls[lw++] = l;
    }
    ls.length = lw;
  }

  draw(g, sprites, t, view = FLAT_VIEW) {
    const e = view.e;
    // lasers beneath bullets
    for (const l of this.lasers) drawLaser(g, l, t, view);
    // in 3D draw far bullets first so near ones overlap them
    const items = this.list.map(b => ({ b, p: view.P(b.x, b.y) }));
    if (e > 0) items.sort((a, c) => a.p.s - c.p.s);
    for (const { b, p } of items) {
      if (p.s > 6) continue; // behind / too close to the camera plane
      if (b.delay > 0) {
        // spawn indicator: a small pulsing ring so the player can read where bullets will come from
        const k = 0.5 + 0.5 * Math.sin((b.delay + t) * 0.5);
        g.globalAlpha = 0.25 + 0.35 * k;
        g.fillStyle = '#ffffff';
        const q = Math.max(1, 2 * p.s);
        g.fillRect(Math.round(p.x - q / 2), Math.round(p.y - q / 2), q, q);
        g.globalAlpha = 1;
        continue;
      }
      const img = b.sprite || sprites.procedural.orb[b.color] || sprites.procedural.orb.white;
      const sc = Math.max(0.2, p.s);
      const w = img.width * sc;
      // far bullets fade slightly so the depth reads
      const depthA = e > 0 ? lerp(1, Math.min(1, 0.35 + 0.65 * p.s), e) : 1;
      const fadeA = b.fade ? Math.max(0, 1 - b.fade / 14) : 1;
      g.globalAlpha = fadeA * depthA;
      if (e > 0) g.drawImage(img, Math.round(p.x - w / 2), Math.round(p.y - w / 2), w, w);
      else g.drawImage(img, Math.round(b.x - img.width / 2), Math.round(b.y - img.width / 2));
    }
    g.globalAlpha = 1;
  }
}

export function pointToLine(px, py, cx, cy, ang) {
  // distance from point to the infinite line through (cx,cy) with direction ang,
  // limited to the segment of half-length 600 (lasers are long enough to span the screen)
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const t = (px - cx) * dx + (py - cy) * dy;
  const tc = Math.max(-600, Math.min(600, t));
  const qx = cx + dx * tc, qy = cy + dy * tc;
  return Math.hypot(px - qx, py - qy);
}

// Field points along the laser (clipped to the field box), projected through the view.
function laserPath(l, view) {
  const dx = Math.cos(l.ang), dy = Math.sin(l.ang);
  if (!view.on) return [[l.x - dx * 700, l.y - dy * 700, 1], [l.x + dx * 700, l.y + dy * 700, 1]];
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const tt = -700 + (1400 * i) / 120;
    const x = l.x + dx * tt, y = l.y + dy * tt;
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
    const p = view.P(x, y);
    pts.push([p.x, p.y, p.s]);
  }
  return pts;
}

function strokePath(g, pts) {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
}

function drawLaser(g, l, t, view = FLAT_VIEW) {
  const pts = laserPath(l, view);
  const sc = pts.length ? pts[Math.floor(pts.length / 2)][2] : 1;
  if (l.age <= l.warn) {
    // telegraph: thin dashed beam, pulsing alpha
    const a = 0.25 + 0.25 * Math.sin((l.age + t) * 0.4);
    g.save();
    g.globalAlpha = a;
    g.strokeStyle = '#ffd6e0';
    g.lineWidth = Math.max(1, sc);
    g.setLineDash([6, 6]);
    strokePath(g, pts);
    g.restore();
    return;
  }
  const fadeIn = Math.min(1, (l.age - l.warn) / 6);
  g.save();
  g.lineCap = 'round';
  g.globalAlpha = 0.28 * fadeIn;
  g.strokeStyle = '#ff5d7a';
  g.lineWidth = (l.thick + 10) * sc;
  strokePath(g, pts);
  g.globalAlpha = 0.85 * fadeIn;
  g.strokeStyle = '#ff3d62';
  g.lineWidth = l.thick * sc;
  strokePath(g, pts);
  g.globalAlpha = fadeIn;
  g.strokeStyle = '#fff5f8';
  g.lineWidth = Math.max(2, l.thick * 0.35) * sc;
  strokePath(g, pts);
  g.restore();
}
