/* ============================================================
 * 常夜桜 particles.js
 * 光・火花・花弁・波紋・背景舞い桜
 * ============================================================ */
'use strict';

const Particles = {
  list: [],
  rings: [],
  ambientT: 0,

  reset() { this.list.length = 0; this.rings.length = 0; this.ambientT = 0; },

  add(p) {
    if (this.list.length > 640) return;
    p.age = 0;
    this.list.push(p);
  },
  burst(x, y, c, n, sp) {
    for (let i = 0; i < n; i++) {
      const a = rnd(TAU), v = rnd(0.4, 1) * sp;
      this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(18, 40), t: -1, c, kind: 'spark', size: rnd(0.7, 1.4) });
    }
  },
  ring(x, y, maxR, c) {
    this.rings.push({ x, y, r: 6, maxR, age: 0, life: 26, c });
  },
  /* 弾→花弁変換: 消えた弾の速度を受けて舞い落ちる */
  petalAt(x, y, v, vx0 = 0, vy0 = 0) {
    if (this.list.length > 560) return;
    this.add({
      x, y,
      vx: vx0 * 0.15 + rnd(-0.5, 0.5), vy: vy0 * 0.1 + rnd(0.2, 0.7),
      life: rnd(50, 100), t: v, kind: 'petal', spin: rndi(0, 7), spinV: rnd(0.06, 0.2),
    });
  },
  /* 環境の舞い桜(全状態で常時) */
  updateAmbient(inBattle) {
    this.ambientT--;
    const rate = inBattle ? 26 : 16;
    if (this.ambientT <= 0) {
      this.ambientT = rate;
      const night = G.run && G.run.phaseIdx === 6;
      this.add({
        x: rnd(-10, G.W + 10), y: -8,
        vx: rnd(0.1, 0.5), vy: rnd(0.35, 0.85),
        life: 1900, t: rndi(0, 2), kind: 'petal', spin: rndi(0, 7), spinV: rnd(0.03, 0.12),
        sway: rnd(0.4, 1.2), seed: rnd(TAU), dim: night ? 0.25 : 0.55,
      });
    }
  },

  update(inBattle) {
    this.updateAmbient(inBattle);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age++;
      if (p.kind === 'petal') {
        p.spin += p.spinV;
        const sway = p.sway || 0;
        p.x += p.vx + Math.sin(p.age * 0.05 + (p.seed || 0)) * sway;
        p.y += p.vy;
        if (p.y > G.H + 14 || p.age > p.life) this.list.splice(i, 1);
      } else {
        p.vx *= 0.97; p.vy *= 0.97;
        p.x += p.vx; p.y += p.vy;
        if (p.kind === 'glow') { p.vy -= 0.004; }
        if (p.age > p.life) this.list.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age++;
      r.r = lerp(6, r.maxR, easeOut(r.age / r.life));
      if (r.age >= r.life) this.rings.splice(i, 1);
    }
  },

  draw(x, t) {
    /* リング波紋 */
    for (const r of this.rings) {
      const a = 1 - r.age / r.life;
      x.save();
      x.globalAlpha = a * 0.8;
      x.strokeStyle = BCOL[r.c]?.mid || '#fff';
      x.lineWidth = 2;
      x.beginPath(); x.arc(r.x, r.y, r.r, 0, TAU); x.stroke();
      x.globalAlpha = a * 0.4;
      x.lineWidth = 5;
      x.beginPath(); x.arc(r.x, r.y, r.r * 0.86, 0, TAU); x.stroke();
      x.restore();
    }
    /* パーティクル */
    for (const p of this.list) {
      const pr = 1 - p.age / p.life;
      if (p.kind === 'spark') {
        const spr = S.spark[p.c] || S.spark.white;
        const w = spr.width * p.size * (0.5 + pr * 0.5);
        x.save();
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = pr;
        x.drawImage(spr, p.x - w / 2, p.y - w / 2, w, w);
        x.restore();
      } else if (p.kind === 'spark2') {
        x.save();
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = pr;
        x.fillStyle = BCOL[p.c]?.hi || '#fff';
        x.fillRect(p.x - 1, p.y - 1, 2, 2);
        x.restore();
      } else if (p.kind === 'glow') {
        const spr = S.glow[p.c] || S.glow.cyan;
        const w = p.size * (0.6 + pr * 0.4);
        x.save();
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = pr * 0.7;
        x.drawImage(spr, p.x - w / 2, p.y - w / 2, w, w);
        x.restore();
      } else if (p.kind === 'petal') {
        const rots = S.miniPetal[p.t % 3];
        const idx = ((Math.round(p.spin) % 8) + 8) % 8;
        x.save();
        x.globalAlpha = (p.dim ?? 1) * Math.min(1, p.life - p.age > 30 ? (p.age < 20 ? p.age / 20 : 1) : (p.life - p.age) / 30);
        x.drawImage(rots[idx], p.x - 5, p.y - 5);
        x.restore();
      }
    }
  },
};
