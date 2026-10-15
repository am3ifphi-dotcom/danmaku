// Automated survival check (v2): runs the real game logic (game.update) headless with a planner bot.
// The planner searches a time-expanded reachability grid (4px cells, 5-frame steps, 30-frame horizon)
// over predicted bullet and laser positions, so it only moves along routes that were safe in the
// prediction. It is a proxy for fairness/clearability only, NOT a human playtest.
// Usage: node bot2.cjs <stageIndex0Based> <easy|normal|hard> <seeds>
const chromiumMod = require('@sparticuz/chromium');
const chromium = chromiumMod.default || chromiumMod;
const puppeteer = require('puppeteer-core');

const stageIdx = parseInt(process.argv[2] || '0', 10);
const diffKey = process.argv[3] || 'normal';
const seeds = parseInt(process.argv[4] || '1', 10);

(async () => {
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath: exe, args: chromium.args, headless: true, protocolTimeout: 900000,
    defaultViewport: { width: 800, height: 450 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/index.html', { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 800));

  const out = [];
  for (let s = 0; s < seeds; s++) {
    const res = await page.evaluate((stageIdx, diffKey, seed) => {
      // seeded PRNG for tie-breaking noise (reproducible per seed)
      let rs = (seed * 2654435761) >>> 0;
      const rng = () => { rs = (rs + 0x6D2B79F5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

      const CELL = 4, GW = 160, GH = 90, DT = 3, S = 10, REACH = 3; // REACH cells = 12px per step (box)
      const dilate = (src) => {
        const tmp = new Uint8Array(GW * GH), out = new Uint8Array(GW * GH);
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          if (!src[y * GW + x]) continue;
          const x0 = Math.max(0, x - REACH), x1 = Math.min(GW - 1, x + REACH);
          for (let xx = x0; xx <= x1; xx++) tmp[y * GW + xx] = 1;
        }
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          if (!tmp[y * GW + x]) continue;
          const y0 = Math.max(0, y - REACH), y1 = Math.min(GH - 1, y + REACH);
          for (let yy = y0; yy <= y1; yy++) out[yy * GW + x] = 1;
        }
        return out;
      };
      const markDisk = (d, x, y, r) => {
        const rc = Math.ceil((r + 2.9) / CELL);
        const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
        for (let yy = Math.max(0, cy - rc); yy <= Math.min(GH - 1, cy + rc); yy++) {
          for (let xx = Math.max(0, cx - rc); xx <= Math.min(GW - 1, cx + rc); xx++) {
            const px = xx * CELL + CELL / 2, py = yy * CELL + CELL / 2;
            if (Math.hypot(px - x, py - y) < r + 2.9) d[yy * GW + xx] = 1;
          }
        }
      };
      const markLaser = (d, l, ang, r, ox, oy) => {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        for (let t = -700; t <= 700; t += 3) {
          const x = ox + dx * t, y = oy + dy * t;
          if (x < -10 || x > 650 || y < -10 || y > 370) continue;
          markDisk(d, x, y, r);
        }
      };
      // Plan from the current state; returns the target cell centre for the next DT frames, or null.
      const plan = (run, bvx, bvy) => {
        const p = run.player;
        const hitR = p.hit + 1.5;
        // simulate each live bullet with the game's own rules (curve, delayed homing toward the
        // player's current position, turn-after-distance, delay), sampled every DT frames
        const trajs = [];
        for (const b of run.B.list) {
          if (b.fade || !b.alive) continue;
          const st = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, age: b.age, dist: b.dist || 0, turned: !!b.turned, delay: b.delay || 0 };
          const pos = [[st.x, st.y]]; pos.r = b.r;
          for (let f = 1; f <= S * DT; f++) {
            if (st.delay > 0) { st.delay--; }
            else {
              st.age++;
              if (b.curve) { const c = Math.cos(b.curve), sn = Math.sin(b.curve); const nvx = st.vx * c - st.vy * sn; st.vy = st.vx * sn + st.vy * c; st.vx = nvx; }
              if (b.homing && st.age > (b.homeDelay || 0)) {
                const want = Math.atan2(p.y - st.y, p.x - st.x), cur = Math.atan2(st.vy, st.vx);
                let dd = want - cur; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
                const tt = Math.max(-b.homing, Math.min(b.homing, dd)), sp0 = Math.hypot(st.vx, st.vy), na = cur + tt;
                st.vx = Math.cos(na) * sp0; st.vy = Math.sin(na) * sp0;
              }
              const sp = Math.hypot(st.vx, st.vy);
              if (b.turnDist && !st.turned) {
                st.dist += sp;
                if (st.dist >= b.turnDist) { st.turned = true; const na = Math.atan2(st.vy, st.vx) + b.turnAng; st.vx = Math.cos(na) * sp; st.vy = Math.sin(na) * sp; }
              }
              st.x += st.vx; st.y += st.vy;
            }
            if (f % DT === 0) pos.push([st.x, st.y]);
          }
          trajs.push(pos);
        }
        const D = [];
        for (let k = 0; k <= S; k++) {
          const d = new Uint8Array(GW * GH);
          const tk = k * DT;
          // the player is clamped to x in [16,624], y in [44,340]: everything outside is unusable
          for (let yy = 0; yy < GH; yy++) for (let xx = 0; xx < GW; xx++) {
            const px = xx * CELL + CELL / 2, py = yy * CELL + CELL / 2;
            if (px < 16 || px > 624 || py < 44 || py > 340) d[yy * GW + xx] = 1;
          }
          if (k > 0) for (const pos of trajs) {
            const q = pos[k];
            if (!q) continue;
            if (q[0] < -20 || q[0] > 660 || q[1] < -20 || q[1] > 380) continue;
            markDisk(d, q[0], q[1], pos.r + hitR);
          }
          for (const l of run.B.lasers) {
            if (!l.alive) continue;
            const age = l.age + tk;
            if (age <= l.warn || age > l.warn + l.active) continue;
            // lasers pivot on the boss, which moves: extrapolate the pivot with the boss velocity
            markLaser(d, l, l.ang + l.omega * tk, l.thick / 2 + hitR + 3, l.x + bvx * tk, l.y + bvy * tk);
          }
          D.push(d);
        }
        const cellOf = (x, y) => Math.min(GH - 1, Math.max(0, Math.floor(y / CELL))) * GW + Math.min(GW - 1, Math.max(0, Math.floor(x / CELL)));
        // forward reachable sets R_k (safe at step k)
        const R = [];
        const start = new Uint8Array(GW * GH); start[cellOf(p.x, p.y)] = 1; R.push(start);
        for (let k = 1; k <= S; k++) {
          const dl = dilate(R[k - 1]);
          for (let i = 0; i < GW * GH; i++) if (D[k][i]) dl[i] = 0;
          R.push(dl);
        }
        // backward: keep only states from which the horizon can still be survived
        const A = new Array(S + 1);
        A[S] = R[S];
        for (let k = S - 1; k >= 1; k--) {
          const dn = dilate(A[k + 1]);
          const a = new Uint8Array(GW * GH);
          for (let i = 0; i < GW * GH; i++) a[i] = R[k][i] && dn[i] ? 1 : 0;
          A[k] = a;
        }
        const dn = dilate(A[1]);
        // choose the next-step cell: close to the current position, lightly biased to the lower-middle area
        let best = null, bestS = Infinity;
        const homeX = 320, homeY = 230;
        for (let i = 0; i < GW * GH; i++) {
          if (!(R[1][i] && dn[i])) continue;
          const cx = (i % GW) * CELL + CELL / 2, cy = Math.floor(i / GW) * CELL + CELL / 2;
          const sc = Math.hypot(cx - p.x, cy - p.y) + 0.1 * Math.hypot(cx - homeX, cy - homeY) + rng() * 0.5;
          if (sc < bestS) { bestS = sc; best = [cx, cy]; }
        }
        window.__plan = { D, R, A, best, cellOf, frame: run.frameDbg, lasers: run.B.lasers.map(l => ({ age: l.age, alive: l.alive, ang: +l.ang.toFixed(4), omega: l.omega, x: +l.x.toFixed(1), y: +l.y.toFixed(1), warn: l.warn, active: l.active })), pl: [p.x, p.y] };
        return best;
      };

      const g = window.__danmaku;
      g.diffKey = diffKey;
      g.diff = window.__DIFF[diffKey];
      g.startStage(stageIdx);
      g.screen = 'stage';
      const keys = g.input.down;
      let frames = 0, hits = 0, maxB = 0, sumB = 0, fallback = 0;
      const hitLog = [];
      let target = null, nextPlan = 0; const bossHist = [];
      const t0 = performance.now();
      while (g.screen === 'stage' && frames < 60 * 60 * 12) {
        const run = g.run;
        if (!run) break;
        const p = run.player;
        keys.delete('ArrowLeft'); keys.delete('ArrowRight'); keys.delete('ArrowUp'); keys.delete('ArrowDown'); keys.delete('ShiftLeft');
        if (run.state === 'play' || run.state === 'intro') {
          if (frames >= nextPlan) {
            run.frameDbg = frames;
            // boss velocity averaged over the last 5 frames (the laser pivot follows the boss)
            const hist = bossHist;
            const old5 = hist.length >= 5 ? hist[hist.length - 5] : hist[0];
            const bvx = old5 ? (run.boss.x - old5[0]) / Math.max(1, hist.length >= 5 ? 5 : hist.length) : 0;
            const bvy = old5 ? (run.boss.y - old5[1]) / Math.max(1, hist.length >= 5 ? 5 : hist.length) : 0;
            target = plan(run, bvx, bvy);
            nextPlan = frames + DT;
            if (!target) fallback++;
          }
          if (target) {
            const dx = target[0] - p.x, dy = target[1] - p.y;
            const L = Math.hypot(dx, dy);
            if (L > 0.8) {
              const k = Math.min(1, L / 3.0);
              if (dx / L * k < -0.25) keys.add('ArrowLeft');
              if (dx / L * k > 0.25) keys.add('ArrowRight');
              if (dy / L * k < -0.25) keys.add('ArrowUp');
              if (dy / L * k > 0.25) keys.add('ArrowDown');
            }
          }
        }
        const before = p.lives;
        bossHist.push([run.boss.x, run.boss.y]); if (bossHist.length > 6) bossHist.shift();
        if (!window.__trace) window.__trace = [];
        { const ld = run.B.lasers.filter(l => l.alive && l.age > l.warn).map(l => { const dx=Math.cos(l.ang), dy=Math.sin(l.ang); const t=(p.x-l.x)*dx+(p.y-l.y)*dy; return +Math.hypot(p.x-(l.x+dx*t), p.y-(l.y+dy*t)).toFixed(1); });
          window.__trace.push({ f: frames, px: +p.x.toFixed(1), py: +p.y.toFixed(1), tgt: target ? [+target[0].toFixed(0), +target[1].toFixed(0)] : null, ld, keys: [...keys].join(',') });
          if (window.__trace.length > 24) window.__trace.shift(); }
        g.update();
        frames++;
        if (g.run && g.run.B) { maxB = Math.max(maxB, g.run.B.list.length); sumB += g.run.B.list.length; }
        if (g.run && g.run.player.lives < before) {
          hits++;
          const pl = g.run.player;
          const pl0 = window.__plan; let dbgPlan = null;
          if (pl0) { const ci = pl0.cellOf(pl.x, pl.y); dbgPlan = { planFrame: pl0.frame, dangerAtCell: pl0.D.map(d => d[ci]), inR: pl0.R.map(r => r[ci]), inA: pl0.A.map(a => a ? a[ci] : null), target: pl0.best, ageNow: frames }; }
          hitLog.push({ planLasers: pl0 && pl0.lasers, planPl: pl0 && pl0.pl, trace: window.__trace.slice(-3), dbgPlan, t: +(frames / 60).toFixed(1), phase: g.run.phaseIdx, phaseT: g.run.phaseT, px: +pl.x.toFixed(0), py: +pl.y.toFixed(0), culprit: g.run.lastHit, lasers: g.run.B.lasers.map(l => ({ x: +l.x.toFixed(1), y: +l.y.toFixed(1), ang: +l.ang.toFixed(3), age: l.age, warn: l.warn, active: l.active, thick: l.thick, alive: l.alive, follow: !!l.follow })), boss: { x: +g.run.boss.x.toFixed(1), y: +g.run.boss.y.toFixed(1) }, state: g.run.state });
        }
      }
      const ms = performance.now() - t0;
      const outcome = g.screen === 'result' ? 'CLEARED' : g.screen === 'gameover' ? 'DEAD' : 'TIMEOUT:' + g.screen;
      const r = g.result;
      return {
        outcome, frames, seconds: +(frames / 60).toFixed(1), hits,
        graze: r ? r.graze : (g.run ? g.run.graze : null),
        score: r ? r.score : null,
        maxBullets: maxB, avgBullets: Math.round(sumB / Math.max(1, frames)),
        planFallbacks: fallback, wallMsPerSimSec: +(ms / (frames / 60)).toFixed(2), hitLog,
      };
    }, stageIdx, diffKey, s + 1);
    out.push(res);
    await page.evaluate(() => { const g = window.__danmaku; g.screen = 'select'; g.run = null; });
  }
  console.log(JSON.stringify({ stage: stageIdx + 1, diff: diffKey, runs: out, errors }, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
