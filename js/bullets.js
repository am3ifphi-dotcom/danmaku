/* ============================================================
 * 常夜桜 bullets.js
 * 弾幕エンジン: 弾プール / レーザー / 当たり判定 / グレイズ
 * 哲学: 「速さ」ではなく「形と間と読みやすさ」で難しくする
 * ============================================================ */
'use strict';

const Bullets = {
  list: [],
  lasers: [],
  MAX: 1200,
  grazeR: 13,

  reset() { this.list.length = 0; this.lasers.length = 0; },

  /* o: {x,y,a,s,t,c, delay, life, homing{rate,max}, curve, accel, sway{amp,fq}, bounce, scale, invt} */
  spawn(o) {
    if (this.list.length >= this.MAX) return null;
    const b = {
      x: o.x, y: o.y, a: o.a ?? 0, s: o.s ?? 1,
      vx: 0, vy: 0,
      t: o.t || 'orb', c: o.c || 'white',
      r: o.r ?? S.bulHitR[o.t || 'orb'],
      age: 0, delay: o.delay || 0, life: o.life || 0,
      homing: o.homing || null, curve: o.curve || 0, accel: o.accel || 0,
      sway: o.sway || null, bounce: o.bounce || 0,
      scale: o.scale || 1, spin: o.spin || 0,
      grazed: false, invt: o.invt || 0,
    };
    b.vx = Math.cos(b.a) * b.s;
    b.vy = Math.sin(b.a) * b.s;
    this.list.push(b);
    return b;
  },

  /* 便利関数: 円形/n方向 */
  ring(x, y, n, a0, opt, aRange = TAU) {
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * aRange;
      this.spawn({ ...opt, x, y, a });
    }
  },

  update() {
    const P = Player;
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.age++;
      if (b.delay > 0) { b.delay--; continue; }
      if (b.invt > 0) b.invt--;

      /* 追尾 (阻限のある弱誘導: 必ず振り切れる設計) */
      if (b.homing && b.homing.t > 0) {
        b.homing.t--;
        if (P.alive) {
          const want = Math.atan2(P.y - b.y, P.x - b.x);
          const cur = Math.atan2(b.vy, b.vx);
          const na = angLerp(cur, want, b.homing.rate);
          const sp = Math.hypot(b.vx, b.vy);
          const maxTurn = b.homing.rate;
          let d = na - cur;
          if (Math.abs(d) > maxTurn) d = Math.sign(d) * maxTurn;
          b.vx = Math.cos(cur + d) * sp;
          b.vy = Math.sin(cur + d) * sp;
        }
      }
      /* カーブ */
      if (b.curve) {
        const sp = Math.hypot(b.vx, b.vy);
        const cur = Math.atan2(b.vy, b.vx) + b.curve;
        b.vx = Math.cos(cur) * sp; b.vy = Math.sin(cur) * sp;
      }
      if (b.accel) {
        b.vx *= (1 + b.accel); b.vy *= (1 + b.accel);
      }
      let sx = 0, sy = 0;
      if (b.sway) {
        sx = Math.cos(b.age * b.sway.fq) * b.sway.amp;
        sy = Math.sin(b.age * b.sway.fq * 0.7) * b.sway.amp * 0.6;
      }
      b.x += b.vx + sx;
      b.y += b.vy + sy;

      /* 画面端反射 */
      if (b.bounce > 0) {
        if ((b.x < G.PF.x0 + b.r && b.vx < 0) || (b.x > G.PF.x1 - b.r && b.vx > 0)) {
          b.vx = -b.vx; b.bounce--;
          Particles.add({ x: b.x, y: b.y, vx: -b.vx * 0.3, vy: 0, life: 12, t: -1, c: b.c, kind: 'spark2', size: 1 });
          SFX.soft();
        } else if ((b.y < G.PF.y0 + b.r && b.vy < 0) || (b.y > G.PF.y1 - b.r && b.vy > 0)) {
          b.vy = -b.vy; b.bounce--;
          SFX.soft();
        }
      } else if (b.x < G.PF.x0 - 40 || b.x > G.PF.x1 + 40 || b.y < G.PF.y0 - 46 || b.y > G.PF.y1 + 40) {
        list.splice(i, 1); continue;
      }
      /* 寿命 */
      if (b.life > 0 && b.age > b.life) {
        Particles.add({ x: b.x, y: b.y, vx: 0, vy: 0, life: 14, t: -1, c: b.c, kind: 'spark2', size: 1 });
        list.splice(i, 1); continue;
      }

      /* 自機との判定 */
      if (P.alive) {
        const d2 = dist2(b.x, b.y, P.x, P.y);
        const hitR = b.r + P.r;
        if (b.invt <= 0 && d2 < hitR * hitR) {
          if (P.hit()) { list.splice(i, 1); continue; }
        } else if (!b.grazed && d2 < (this.grazeR + b.r) * (this.grazeR + b.r)) {
          b.grazed = true;
          G.run.graze++;
          G.run.score += 10;
          SFX.graze();
          Particles.add({ x: P.x, y: P.y, vx: (P.x - b.x) * 0.06, vy: (P.y - b.y) * 0.06, life: 10, t: -1, c: 'white', kind: 'spark2', size: 1 });
        }
      }
    }
    /* レーザー */
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const L = this.lasers[i];
      L.age++;
      L.a += L.angV;
      if (L.age >= L.warm + L.act + L.fade) { this.lasers.splice(i, 1); continue; }
      if (L.age >= L.warm && L.age < L.warm + L.act && P.alive && P.invuln <= 0) {
        /* 点-線分距離 */
        const x2 = L.x + Math.cos(L.a) * L.len, y2 = L.y + Math.sin(L.a) * L.len;
        const dx = x2 - L.x, dy = y2 - L.y;
        const tt = clamp(((P.x - L.x) * dx + (P.y - L.y) * dy) / (dx * dx + dy * dy), 0, 1);
        const px = L.x + dx * tt, py = L.y + dy * tt;
        const hw = L.w * 0.20 + P.r;
        if (dist2(P.x, P.y, px, py) < hw * hw) P.hit();
      }
    }
    if (G.run) {
      const n = list.length;
      if (n > G.run.maxBullets) G.run.maxBullets = n;
    }
  },

  spawnLaser(o) { // {x,y,a,angV,w,len,warm,act,fade,c}
    const L = {
      x: o.x, y: o.y, a: o.a, angV: o.angV || 0,
      w: o.w ?? 40, len: o.len ?? 900,
      age: 0, warm: o.warm ?? 90, act: o.act ?? 300, fade: o.fade ?? 30,
      c: o.c || 'gold',
    };
    this.lasers.push(L);
    SFX.laserCharge();
    return L;
  },

  /* 弾消去(花弁へ変換) */
  clearAll(toPetal = true) {
    for (const b of this.list) {
      if (toPetal) Particles.petalAt(b.x, b.y, b.c === 'pink' ? 0 : rndi(0, 2), b.vx, b.vy);
    }
    this.list.length = 0;
  },
  clearRadius(cx, cy, r, toPetal) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      if (dist2(b.x, b.y, cx, cy) < r * r) {
        if (toPetal) Particles.petalAt(b.x, b.y, rndi(0, 2), b.vx, b.vy);
        this.list.splice(i, 1);
      }
    }
  },

  draw(x, t) {
    /* 予告線(温め中レーザー)は弾より下層 */
    for (const L of this.lasers) {
      if (L.age < L.warm) {
        const pr = L.age / L.warm;
        x.save();
        x.globalAlpha = 0.30 + Math.sin(t * 18) * 0.18 + pr * 0.2;
        x.strokeStyle = BCOL[L.c].mid;
        x.lineWidth = 2 + pr * 2;
        x.beginPath();
        x.moveTo(L.x, L.y);
        x.lineTo(L.x + Math.cos(L.a) * L.len, L.y + Math.sin(L.a) * L.len);
        x.stroke();
        x.globalCompositeOperation = 'lighter';
        const chg = 10 + pr * 14;
        x.drawImage(S.laserCharge, L.x - chg, L.y - chg, chg * 2, chg * 2);
        x.restore();
      }
    }
    /* 弾 */
    for (const b of this.list) {
      const sprKey = b.t;
      const set = S.bul[b.c][sprKey];
      let spr;
      if (Array.isArray(set)) {
        const ang = Math.atan2(b.vy, b.vx) + b.spin * b.age * 0.02;
        const idx = ((Math.round((ang / TAU) * 16) % 16) + 16) % 16;
        spr = set[idx];
      } else spr = set;
      const w = spr.width * b.scale, h = spr.height * b.scale;
      if (b.delay > 0) {
        /* 発射予告: 半透明で小さく */
        x.save();
        x.globalAlpha = 0.3 + Math.sin(t * 15 + b.x) * 0.12;
        x.drawImage(spr, b.x - w * 0.3, b.y - h * 0.3, w * 0.6, h * 0.6);
        x.restore();
      } else {
        x.drawImage(spr, b.x - w / 2, b.y - h / 2, w, h);
      }
    }
    /* 稼働レーザー(弾の上・自機の下) */
    for (const L of this.lasers) {
      if (L.age < L.warm) continue;
      const actPr = clamp((L.age - L.warm) / 6, 0, 1);
      const fadePr = L.age >= L.warm + L.act ? 1 - (L.age - L.warm - L.act) / L.fade : 1;
      const lz = S.laser[L.c];
      const wHalf = lz.w * actPr * fadePr;
      x.save();
      x.translate(L.x, L.y);
      x.rotate(L.a);
      x.globalAlpha = fadePr;
      x.globalCompositeOperation = 'lighter';
      /* 先端・本体・根元 */
      x.drawImage(lz.mid, 0, -wHalf / 2, L.len, wHalf);
      x.save();
      x.translate(L.len, 0); x.rotate(0);
      x.drawImage(lz.cap, -lz.w / 2 * fadePr * 0.4, -wHalf * 1.1, lz.w * 1.2 * fadePr, wHalf * 2.2);
      x.restore();
      x.drawImage(lz.cap, -lz.w * 0.3, -wHalf * 1.1, lz.w * 1.2, wHalf * 2.2);
      x.restore();
    }
  },

  count() { return this.list.length; },
};
