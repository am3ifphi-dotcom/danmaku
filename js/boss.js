/* ============================================================
 * 常夜桜 boss.js
 * 月の巫女「ツクヨミ」— 本作の主役
 * アニメーション: 顕現/浮遊/予備動作/フェーズ転生/消滅
 * ============================================================ */
'use strict';

const Boss = {
  x: 240, y: -90,           // 登場前は上空
  homeX: 240, homeY: 150,
  phase: 0,
  state: 'hidden',          // hidden|intro|idle|transition|defeat
  animT: 0,
  driftT: 0,
  windupT: 0, windupDur: 0,
  pulseT: 0,                // 発射パルス(御幣が光る)
  blinkT: 120,
  transT: 0, transHalf: false,
  defeatT: 0,
  shiki: [],                // 式神 {ang, r, alive, fire}
  shikiN: 0,
  maskAng: 0,
  scale: 2,                 // 46x62 → 92x124 表示

  /* -------- 顕現 -------- */
  startIntro() {
    this.state = 'intro';
    this.animT = 0;
    this.x = 240; this.y = -90;
    this.phase = 0;
    this.shiki = [];
  },

  /* -------- フェーズ転生 -------- */
  startTransition(nextPhase, shikiN) {
    this.state = 'transition';
    this.transT = 0;
    this.transHalf = false;
    this._nextPhase = nextPhase;
    this._nextShiki = shikiN;
  },

  setShiki(n) {
    while (this.shiki.length < n) {
      const i = this.shiki.length;
      this.shiki.push({ ang: (i / Math.max(1, n)) * TAU, r: 0, alive: true, fireT: rnd(0, 60) });
    }
    while (this.shiki.length > n) {
      const s = this.shiki.pop();
      if (s) Particles.burst(this.x + Math.cos(s.ang) * s.r, this.y + Math.sin(s.ang) * s.r * 0.7, 'white', 5, 1.4);
    }
    this.shikiN = n;
  },

  /* -------- 消滅(クリア) -------- */
  startDefeat() {
    this.state = 'defeat';
    this.defeatT = 0;
    Bullets.clearAll(true);
  },

  windup(frames, kind = 'gohei') {
    this.windupDur = frames;
    this.windupT = frames;
    this._windupKind = kind;
  },
  pulse() { this.pulseT = 9; SFX.shootSoft(); },

  get pal() { return S.boss[this.phase].pal; },
  get spr() { return S.boss[this.phase]; },

  shikiPos(i) {
    const s = this.shiki[i];
    return { x: this.x + Math.cos(s.ang) * s.r, y: this.y + Math.sin(s.ang) * s.r * 0.62 };
  },

  /* -------- drift: フェーズ毎の浮遊軌道 -------- */
  _drift() {
    const k2 = G.run ? G.run.diff.driftSpd : 1;
    const t = this.driftT * (0.75 + k2 * 0.25);
    const P = [ // フェーズ別の軌跡
      [240 + Math.sin(t * 0.010) * 90, 150 + Math.sin(t * 0.017) * 22],
      [240 + Math.sin(t * 0.012) * 110, 148 + Math.sin(t * 0.021) * 26],
      [240 + Math.sin(t * 0.014) * 120, 146 + Math.cos(t * 0.011) * 30],
      [240 + Math.sin(t * 0.008) * 60, 150 + Math.sin(t * 0.013) * 18],
      [240 + Math.sin(t * 0.011) * 100 + Math.sin(t * 0.031) * 22, 150 + Math.sin(t * 0.019) * 30],
      [240 + Math.sin(t * 0.016) * 130, 144 + Math.sin(t * 0.023) * 34],
      [240 + Math.sin(t * 0.007) * 70, 146 + Math.sin(t * 0.010) * 14],
      [240 + Math.sin(t * 0.012) * 96, 150 + Math.sin(t * 0.016) * 26],
    ];
    const p = P[this.phase] || P[0];
    const k = G.run ? G.run.diff.driftSpd : 1;
    this.homeX = clamp(p[0], 110, G.W - 110);
    this.homeY = p[1];
  },

  update() {
    this.animT++;
    this.driftT++;
    if (this.pulseT > 0) this.pulseT--;
    if (this.blinkT-- <= 0) this.blinkT = rndi(100, 260);

    switch (this.state) {
      case 'hidden': return;
      case 'intro': {
        const pr = Math.min(1, this.animT / 110);
        this.y = lerp(-90, 150, easeOut(pr));
        this.x = 240 + Math.sin(pr * 3) * (1 - pr) * 30;
        if (pr >= 1) { this.state = 'idle'; }
        return;
      }
      case 'transition': {
        this.transT++;
        /* 転生: 一度光に包まれ、形態が変わる */
        if (this.transT === 40 && !this.transHalf) {
          this.transHalf = true;
          this.phase = this._nextPhase;
          this.setShiki(this._nextShiki);
          FX.flash(this.pal.acc, 0.5, 0.3);
          Particles.ring(this.x, this.y, 150, this.pal.glow);
          Particles.burst(this.x, this.y, 'white', 30, 3.4);
        }
        if (this.transT === 1) FX.flash('#ffffff', 0.35, 0.2);
        if (this.transT >= 80) { this.state = 'idle'; }
        return;
      }
      case 'defeat': {
        this.defeatT++;
        this.y -= 0.24 + this.defeatT * 0.003;
        if (this.defeatT % 5 === 0) {
          Particles.petalAt(this.x + rnd(-26, 26), this.y + rnd(-30, 30), rndi(0, 2), rnd(-0.4, 0.4), rnd(0.5, 1.4));
        }
        return;
      }
      default: {
        this._drift();
        this.x = lerp(this.x, this.homeX, 0.04);
        this.y = lerp(this.y, this.homeY + Math.sin(this.animT * 0.05) * 3, 0.05);
        if (this.windupT > 0) this.windupT--;
        /* 式神の軌道 */
        const spd = this.phase === 6 ? 0.006 : 0.010;
        for (let i = 0; i < this.shiki.length; i++) {
          const s = this.shiki[i];
          s.ang += spd * (this.phase % 2 ? -1 : 1);
          s.r = lerp(s.r, 74, 0.03);
        }
      }
    }
  },

  /* -------- 描画 -------- */
  draw(x, t) {
    if (this.state === 'hidden') return;
    const bs = this.spr;
    const px = Math.round(this.x), py = Math.round(this.y);
    const s2 = this.scale;
    const hw = BW * s2 / 2, hh = BH * s2 / 2;
    const windupPr = this.windupDur ? this.windupT / this.windupDur : 0;
    const isUp = this.windupT > 0;

    /* 転生中のフラッシュ抽出処理 */
    const transGlow = this.state === 'transition' ? Math.sin(this.transT / 80 * Math.PI) : 0;

    x.save();
    /* オーラ */
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = 0.32 + Math.sin(t * 2.2) * 0.07 + (isUp ? 0.2 : 0) + transGlow * 0.5;
    const aura = S.glow[bs.pal.glow] || S.glow.white;
    x.drawImage(aura, px - 100, py - 100, 200, 200);
    /* 光環 */
    x.save();
    x.translate(px, py - 10);
    x.rotate(t * 0.25 * (this.phase % 2 ? 1 : -1));
    const haloA = 0.5 + Math.sin(t * 1.8) * 0.1 + (isUp ? 0.3 : 0);
    x.globalAlpha = haloA;
    const hs = 84 * (1 + Math.sin(t * 1.3) * 0.02);
    x.drawImage(bs.halo, -hs, -hs, hs * 2, hs * 2);
    x.restore();
    x.restore();

    /* 式神(本体の後ろ) */
    this._drawShiki(x, t, false);

    /* 本体 */
    x.save();
    if (this.state === 'defeat') {
      x.globalAlpha = Math.max(0, 1 - this.defeatT / 200);
    }
    const breathe = Math.sin(t * 2.6) * 1.6;
    const hairFr = (Math.floor(t * 1.4) % 2);
    /* 後髪 */
    x.drawImage(bs.parts.hair[hairFr], px - hw, py - hh + breathe * 0.4, BW * s2, BH * s2);
    /* 体 */
    x.drawImage(bs.parts.body, px - hw, py - hh, BW * s2, BH * s2);
    /* 転生白化 */
    if (transGlow > 0.05) {
      x.globalAlpha = transGlow * 0.85;
      x.drawImage(S.bossFlash[this.state === 'transition' && this.transHalf ? this.phase : Math.max(0, this.phase - (this.state === 'transition' ? 1 : 0))] || S.bossFlash[this.phase], px - hw, py - hh, BW * s2, BH * s2);
      x.globalAlpha = 1;
    }
    /* 頭 */
    const blink = this.blinkT < 8 && !isUp && this.state === 'idle';
    x.drawImage(blink ? bs.parts.headBlink : bs.parts.head, px - hw, py - hh, BW * s2, BH * s2);
    /* 御幣腕 */
    x.drawImage(isUp ? bs.parts.armUp : bs.parts.armDown, px - hw, py - hh, BW * s2, BH * s2);
    /* 狐面 (フェーズ2以降、傍らに浮遊) */
    if (this.phase >= 2) {
      this.maskAng += 0.008;
      const mx = px + Math.cos(this.maskAng) * 74 - 20, my = py + Math.sin(this.maskAng * 1.3) * 30 - 12;
      x.drawImage(S.foxMask, mx, my, 40, 40);
    }
    x.restore();

    /* 予備動作のチャージ光 */
    if (isUp) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      const charge = (1 - windupPr) * 22 + 8 + Math.sin(t * 20) * 3;
      x.globalAlpha = 0.7;
      x.drawImage(S.laserCharge, px + 14 - charge / 2, py - 78 - charge / 2, charge, charge);
      const glw = 30 + (1 - windupPr) * 26;
      x.globalAlpha = 0.4 + (1 - windupPr) * 0.4;
      x.drawImage(aura, px - glw / 2, py - 92 - glw / 2, glw, glw);
      x.restore();
    }
    /* 発射パルス */
    if (this.pulseT > 0) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = this.pulseT / 9 * 0.8;
      const pw2 = 26 + (9 - this.pulseT) * 5;
      x.drawImage(S.glow.white, px - pw2 / 2, py - 86 - pw2 / 2, pw2, pw2);
      x.restore();
    }

    /* 式神(手前側) */
    this._drawShiki(x, t, true);

    /* 消滅: 光の柱 */
    if (this.state === 'defeat') {
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = Math.min(0.6, this.defeatT / 90) * 0.8;
      for (let i = 0; i < 3; i++) {
        const lw = 14 - i * 4;
        x.fillStyle = i === 0 ? '#fff6d8' : 'rgba(255,220,150,0.5)';
        x.fillRect(px - lw / 2 + Math.sin(t * 3 + i * 2) * 3, 0, lw, py + 40);
      }
      x.restore();
    }
  },

  _drawShiki(x, t, front) {
    for (let i = 0; i < this.shiki.length; i++) {
      const s = this.shiki[i];
      const spx = Math.round(this.x + Math.cos(s.ang) * s.r);
      const spy = Math.round(this.y + Math.sin(s.ang) * s.r * 0.62);
      const isFront = Math.sin(s.ang) > 0;
      if (isFront !== front) continue;
      const fr = (Math.floor(t * 5 + i) % 2);
      const sc = front ? 3 : 2.6;
      x.save();
      x.globalAlpha = front ? 1 : 0.82;
      x.globalCompositeOperation = front ? 'source-over' : 'source-over';
      x.translate(spx, spy);
      x.rotate(Math.sin(t * 2 + i * 1.7) * 0.2 + s.ang * 0.06);
      x.drawImage(S.shiki[fr], -6 * sc / 2, -10 * sc / 2, 6 * sc, 10 * sc);
      /* 式神の火(構成フェーズで灯る) */
      if (this.phase === 2 || this.phase === 5 || this.phase === 6) {
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = 0.5 + Math.sin(t * 4 + i) * 0.2;
        const gs = 16 + Math.sin(t * 3 + i * 2) * 3;
        const c = this.phase === 6 ? S.glow.violet : (this.phase === 5 ? S.glow.amber : S.glow.cyan);
        x.drawImage(c, -gs / 2, -gs / 2 - 4, gs, gs);
      }
      x.restore();
    }
  },
};
