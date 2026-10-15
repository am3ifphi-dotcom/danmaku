/* ============================================================
 * 常夜桜 patterns.js
 * 8フェーズの弾幕パターン工房
 * 設計哲学:
 *  - 弾速は遅め/中速。「形・間(ま)・リズム」で難しくする
 *  - すべてのパターンに回避ルートと視覚的予告を用意
 *  - 画面を美しく埋めるが、必ず抜け道がある
 * ============================================================ */
'use strict';

/* エミッタ: s≦rel≦e の間 fn(rel-s, rel) が毎フレーム呼ばれる */
function EM(s, e, fn) { return { s, e, fn }; }
function EV(t, fn) { return { s: t, e: t, fn: () => fn() }; }

const Patterns = {
  _pulseT: 0,

  reset() { this._pulseT = 0; },

  pulse() {
    if (this._pulseT > 0) return;
    this._pulseT = 12;
    Boss.pulse();
  },
  tick() { if (this._pulseT > 0) this._pulseT--; },

  aimA(x, y) {
    if (Player.alive) return Math.atan2(Player.y - y, Player.x - x);
    return rnd(TAU);
  },
  cap() { return Bullets.list.length >= (G.run.diff.softCap || 900); },

  /* お札の壁(下り): 隙間つき */
  wallDown(gx, halfGap, opt) {
    const y = G.PF.y0 - 16;
    const spd = opt.s;
    for (let x = G.PF.x0 + 10; x <= G.PF.x1 - 10; x += 15) {
      if (Math.abs(x - gx) < halfGap) continue;
      this.spawnOfuda(x, y, Math.PI / 2, spd, opt);
    }
    /* 隙間のガイドマーカー(金の標) */
    for (const gx2 of [gx - halfGap - 4, gx + halfGap + 4]) {
      if (gx2 < G.PF.x0 + 6 || gx2 > G.PF.x1 - 6) continue;
      Bullets.spawn({ x: gx2, y, a: Math.PI / 2, s: spd * 1.02, t: 'bead', c: 'gold' });
    }
  },
  spawnOfuda(x, y, a, s, opt) {
    Bullets.spawn({ x, y, a, s, t: 'ofuda', c: opt.c || 'white', r: 3.2 });
  },

  /* ================= PHASE 1 「月下ノ舞」 =================
   * 役割: 導入。円形弾と自機狙いの「間」を学ぶ。満月と同調した純白の舞 */
  phase1(diff) {
    const cn = n => Math.max(1, Math.round(n * diff.cnt));
    let rot = 0;
    return [
      EM(30, null, (rel) => {
        if (rel % 66 === 0) { // 白の環 volley
          if (!this.cap()) {
            const n = cn(14);
            const a0 = rot += 0.24;
            Bullets.ring(Boss.x, Boss.y + 18, n, a0, { s: 1.5 * diff.spd, t: 'orb', c: 'white' });
            this.pulse();
          }
        }
        if (rel > 240 && rel % 46 === 0) { // 狙い3way
          if (!this.cap()) {
            const a = this.aimA(Boss.x, Boss.y + 20);
            Bullets.ring(Boss.x, Boss.y + 20, 3, a - 0.22, { s: 2.1 * diff.spd, t: 'bead', c: 'gold' }, 0.44);
          }
        }
        if (rel > 480 && rel % 150 === 30) { // 月の欠け: 弧を描く花弁
          const a = this.aimA(Boss.x, Boss.y);
          Bullets.ring(Boss.x, Boss.y, cn(6), a - 0.9, { s: 1.0 * diff.spd, t: 'petal', c: 'pink', scale: 0.9, curve: 0.004 }, 1.8);
        }
      }),
    ];
  },

  /* ================= PHASE 2 「桜吹雪」 =================
   * 役割: 螺旋の流れと壁の隙間抜け。縦移動の動機づけ */
  phase2(diff) {
    const cn = n => Math.max(1, Math.round(n * diff.cnt));
    let dir = 1;
    return [
      EM(30, null, (rel) => {
        if (rel % 240 === 0) { dir *= -1; if (rel > 30) Boss.windup(34); }
        if (rel % 240 < 34) return; // 反転の予備動作
        if (rel % 4 === 0 && !this.cap()) {
          const base = rel * 0.021 * dir;
          for (const off of [0, Math.PI]) {
            Bullets.spawn({ x: Boss.x, y: Boss.y + 10, a: base + off, s: 1.02 * diff.spd, t: 'petal', c: 'pink', scale: 0.95 });
          }
        }
        if (rel % 210 === 120) { // 桜の壁(下り)
          const gx = clamp(G.W / 2 + rnd(-1, 1) * 130 * Math.sin(rel * 0.05), 90, G.W - 90);
          this.wallDown(gx, 52 * diff.gap, { s: 0.72 * diff.spd, c: 'white' });
          SFX.soft();
        }
        if (rel % 96 === 40) { // 狙いの苦無
          const a = this.aimA(Boss.x, Boss.y);
          Bullets.ring(Boss.x, Boss.y, 3, a - 0.18, { s: 2.4 * diff.spd, t: 'kunai', c: 'cyan' }, 0.36);
        }
      }),
    ];
  },

  /* ================= PHASE 3 「式神・狐火」 =================
   * 役割: 追尾弾との付き合い方。誘って切り返す */
  phase3(diff) {
    const cn = n => Math.max(1, Math.round(n * diff.cnt));
    let confetti = 0;
    return [
      EM(30, null, (rel) => {
        for (let i = 0; i < Boss.shiki.length; i++) { // 狐火(各式神・時差)
          if ((rel + i * 26) % 96 === 0 && !this.cap()) {
            const p = Boss.shikiPos(i);
            Bullets.spawn({
              x: p.x, y: p.y, a: this.aimA(p.x, p.y), s: 1.55 * diff.spd, t: 'foxfire', c: 'cyan',
              homing: { rate: 0.0165 * diff.hom, t: Math.round(125 * diff.homT) }, life: 330, delay: 14,
            });
          }
        }
        if (rel % 26 === 0 && !this.cap() && Boss.shiki.length > 0) { // 星祭り: 式神たちが紡ぐ青の環礁(ゆるやか)
          const i = Math.floor(rel / 26) % Boss.shiki.length;
          const p = Boss.shikiPos(i);
          Bullets.spawn({ x: p.x, y: p.y, a: (confetti += 0.31), s: 0.95 * diff.spd, t: 'bead', c: 'cyan' });
        }
        if (rel % 90 === 0) { // 巫女の環(紫)
          if (!this.cap()) Bullets.ring(Boss.x, Boss.y + 14, cn(14), rel * 0.05, { s: 1.3 * diff.spd, t: 'orb', c: 'violet' });
        }
        if (rel % 70 === 30) { // 狙い5way苦無
          const a = this.aimA(Boss.x, Boss.y + 16);
          Bullets.ring(Boss.x, Boss.y + 16, 5, a - 0.4, { s: 2.6 * diff.spd, t: 'kunai', c: 'white' }, 0.8);
        }
      }),
    ];
  },

  /* ================= PHASE 4 「注連結界」 =================
   * 役割: 回転結界の中で環に押されない立ち回り。畏れと対価 */
  phase4(diff) {
    const cn = n => Math.max(1, Math.round(n * diff.cnt));
    let lv = 0.0055 * diff.laserSpd;
    return [
      EV(20, () => Boss.windup(70)),
      EV(90, () => { // 結界発動: 十字の回転レーザー
        for (const off of [0, Math.PI]) {
          Bullets.spawnLaser({ x: Boss.x, y: Boss.y, a: off + Math.PI / 2, angV: lv, w: diff.laserW, warm: 80, act: 1600, fade: 40, c: 'gold', len: 1000 });
        }
      }),
      EM(90, null, (rel) => {
        if (rel % 480 === 0) { // 8秒ごとに回転反転(予備動作つき)
          const lvs = [lv, -lv]; lv = lvs[(Math.floor(rel / 480)) % 2];
          for (const L of Bullets.lasers) L.angV = lv * (Math.floor(rel / 480) % 2 === 0 ? 1 : -1);
          Boss.windup(30);
        }
      }),
      EM(150, null, (rel) => {
        if (rel % 76 === 0 && !this.cap()) { // 内から押し出す環(結界から外へ誘導)
          Bullets.ring(Boss.x, Boss.y + 12, cn(14), rel * 0.045, { s: 1.15 * diff.spd, t: 'bead', c: 'white' });
        }
        if (rel % 132 === 60) { // 金の狙い3way
          const a = this.aimA(Boss.x, Boss.y);
          Bullets.ring(Boss.x, Boss.y, 3, a - 0.2, { s: 2.2 * diff.spd, t: 'kunai', c: 'gold' }, 0.4);
        }
        if (rel % 330 === 100) { // 注連縄の垂れ: 天からのお札流れ(明示的な隙間つき)
          const gx = clamp(rnd(110, G.W - 110), 90, G.W - 90);
          this.wallDown(gx, 58 * diff.gap, { s: 0.8 * diff.spd, c: (rel / 330) % 2 ? 'gold' : 'white' });
        }
      }),
    ];
  },

  /* ================= PHASE 5 「散華繚乱」 =================
   * 役割: 開く花と閉じる花。反射の読み。華やかな攻守の間 */
  phase5(diff) {
    const cn = n => Math.max(1, Math.round(n * diff.cnt));
    let arm = 0;
    return [
      EM(30, null, (rel) => {
        if (rel % 260 === 0) { // 開く花(紅)
          Boss.windup(40);
          if (!this.cap()) {
            const n = cn(22);
            Bullets.ring(Boss.x, Boss.y, n, rel * 0.02, { s: 1.62 * diff.spd, t: 'petal', c: 'red', accel: -0.0075, curve: 0.0016 });
          }
        }
        if (rel % 260 === 130) { // 閉じる花(藤): 外周から収斂
          Boss.windup(40);
          if (!this.cap()) {
            const n = cn(20);
            for (let i = 0; i < n; i++) {
              const a = (i / n) * TAU + rel * 0.02;
              const sx = Boss.x + Math.cos(a) * 330, sy = Boss.y + Math.sin(a) * 240;
              Bullets.spawn({ x: sx, y: sy, a: Math.atan2(Boss.y - sy, Boss.x - sx), s: 1.36 * diff.spd, t: 'petal', c: 'violet', delay: 34, curve: -0.0022 });
            }
          }
        }
        if (rel % 150 === 70) { // 翡翠の反射刃
          const a = this.aimA(Boss.x, Boss.y);
          for (const off of [-0.5, 0, 0.5]) {
            Bullets.spawn({ x: Boss.x, y: Boss.y, a: a + off, s: 2.0 * diff.spd, t: 'shard', c: 'jade', bounce: 1 });
          }
        }
        if (rel % 9 === 0 && !this.cap()) { // 下地の渦
          Bullets.spawn({ x: Boss.x, y: Boss.y, a: (arm += 0.14), s: 1.05 * diff.spd, t: 'bead', c: 'white' });
        }
      }),
    ];
  },

  /* ================= PHASE 6 「式神・追月」 =================
   * 役割: 時差連鎖と月輪の隙間。情報量への耐性 */
  phase6(diff) {
    const cn = n => Math.max(1, Math.round(n * diff.cnt));
    let gapA = rnd(TAU);
    return [
      EM(30, null, (rel) => {
        for (let i = 0; i < Boss.shiki.length; i++) { // 式神の4連鎖(時差)
          const cyc = (rel + i * 41) % 170;
          if (cyc < 4 * 10 && cyc % 10 === 0 && !this.cap()) {
            const p = Boss.shikiPos(i);
            const a = this.aimA(p.x, p.y) + rnd(-0.05, 0.05);
            Bullets.spawn({ x: p.x, y: p.y, a, s: 2.3 * diff.spd, t: 'wisp', c: 'amber', delay: cyc === 0 ? 12 : 0 });
          }
        }
        if (rel % 280 === 0) { // 月輪: 2つの隙間を持つ大環
          Boss.windup(46);
          gapA += 0.7;
          const n = cn(19), gap = 0.52 * diff.gap;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            let ok = true;
            for (const gp of [gapA, gapA + Math.PI]) {
              let d = Math.abs(((a - gp) % TAU + TAU) % TAU);
              if (d > Math.PI) d = TAU - d;
              if (d < gap) ok = false;
            }
            if (ok) Bullets.spawn({ x: Boss.x, y: Boss.y, a, s: 1.18 * diff.spd, t: 'orb', c: 'gold', delay: 40 });
          }
          SFX.mandala();
        }
        if (rel % 216 === 100) { // 弓張月: 横に逃げる二条の軌道変化弾
          for (const dir of [1, -1]) {
            for (let k = 0; k < 8; k++) {
              Bullets.spawn({
                x: Boss.x, y: Boss.y, a: -Math.PI / 2 + dir * (0.5 + k * 0.12),
                s: 2.0 * diff.spd, t: 'kunai', c: 'violet', curve: dir * 0.011, delay: k * 3,
              });
            }
          }
        }
      }),
    ];
  },

  /* ================= PHASE 7 「常夜ノ帳」 =================
   * 役割: 闇と高密度の低速弾。見極めと胆力。折鶴の灯りが導く */
  phase7(diff) {
    const cn = n => Math.max(1, Math.round(n * diff.cnt));
    let off = 0;
    return [
      EM(40, null, (rel) => {
        if (rel % 52 === 0 && !this.cap()) { // 夜の千重(ちえ): 交互半歩の多角環
          const n = cn(20);
          off += Math.PI / n;
          const type = (rel / 52) % 4 === 3 ? 'ring' : 'orb';
          Bullets.ring(Boss.x, Boss.y, n, off, { s: 0.92 * diff.spd, t: type, c: (rel / 52) % 4 === 3 ? 'white' : 'violet' });
          if (rel % 156 === 0) this.pulse();
        }
        if (rel % 250 === 110) { // 霧の径: 6車線のうち1つだけ開く
          const lane = rndi(0, 5);
          for (let i = 0; i < 6; i++) {
            if (i === lane) continue;
            const lx = 58 + i * 74;
            for (let k = 0; k < 13; k++) {
              Bullets.spawn({ x: lx, y: G.PF.y0 - 14 - k * 14, a: Math.PI / 2, s: 1.02 * diff.spd, t: 'bead', c: 'white' });
            }
          }
          const gx = 58 + lane * 74;
          for (const ex of [gx - 40, gx + 40]) {
            Bullets.spawn({ x: ex, y: G.PF.y0 - 14, a: Math.PI / 2, s: 1.04 * diff.spd, t: 'bead', c: 'gold' });
          }
        }
        if (rel % 200 === 60) { // 鬼火(緩追)
          for (let i = 0; i < Boss.shiki.length; i++) {
            if ((i + Math.floor(rel / 200)) % 2 === 0) {
              const p = Boss.shikiPos(i);
              Bullets.spawn({
                x: p.x, y: p.y, a: this.aimA(p.x, p.y), s: 1.5 * diff.spd, t: 'wisp', c: 'amber',
                homing: { rate: 0.011 * diff.hom, t: Math.round(170 * diff.homT) }, life: 360, delay: 16,
              });
            }
          }
        }
      }),
    ];
  },

  /* ================= PHASE 8 「月詠終焉」 =================
   * 役割: 全要素の統合。美しく高密度な最終弾幕。月輪の安全地帯 */
  phase8(diff, durF) {
    const cn = n => Math.max(1, Math.round(n * diff.cnt));
    let arm3 = 0, gapA = 0;
    return [
      EV(20, () => Boss.windup(80)),
      EV(100, () => { // 双環レーザー(緩回転・逆向き)
        Bullets.spawnLaser({ x: Boss.x, y: Boss.y, a: Math.PI / 2, angV: 0.003 * diff.laserSpd, w: diff.laserW * 0.9, warm: 90, act: durF, fade: 40, c: 'gold', len: 1000 });
        Bullets.spawnLaser({ x: Boss.x, y: Boss.y, a: 0, angV: -0.0022 * diff.laserSpd, w: diff.laserW * 0.9, warm: 90, act: durF, fade: 40, c: 'pink', len: 1000 });
      }),
      EM(100, null, (rel) => {
        if (rel % 5 === 0 && !this.cap()) { // 三臂の花弁螺旋
          for (const off of [0, TAU / 3, TAU * 2 / 3]) {
            Bullets.spawn({ x: Boss.x, y: Boss.y, a: arm3 + off, s: 1.18 * diff.spd, t: 'petal', c: 'pink', scale: 0.95 });
          }
          arm3 += 0.017;
        }
        if (rel % 60 === 25) { // 狙い5way
          const a = this.aimA(Boss.x, Boss.y);
          Bullets.ring(Boss.x, Boss.y, 5, a - 0.36, { s: 2.6 * diff.spd, t: 'bead', c: 'white' }, 0.72);
        }
        if (rel % 420 === 200) { // 月輪曼荼羅: 巨大環に回転する安全地帯
          Boss.windup(50);
          gapA += 1.3;
          const n = cn(34), gap = 0.46 * diff.gap;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            let d = Math.abs(((a - gapA) % TAU + TAU) % TAU);
            if (d > Math.PI) d = TAU - d;
            if (d > gap) {
              Bullets.spawn({ x: Boss.x, y: Boss.y, a, s: 0.88 * diff.spd, t: 'orb', c: 'gold', delay: 46 });
            }
          }
          SFX.mandala();
          UI.banner('月輪曼荼羅', '— 安全地帯は回転する —', 110);
        }
      }),
      EM(durF - 600, durF, (rel) => { // 終盤10秒: 千の桜灯(うららかな高密度)
        if (rel % 72 === 0 && !this.cap()) {
          Bullets.ring(Boss.x, Boss.y, cn(26), rel * 0.03, { s: 1.0 * diff.spd, t: 'orb', c: 'jade' });
          Bullets.ring(Boss.x, Boss.y, cn(26), rel * 0.03 + 0.06, { s: 0.9 * diff.spd, t: 'petal', c: 'red', scale: 0.9 });
          this.pulse();
        }
      }),
    ];
  },
};
