/* ============================================================
 * 常夜桜 player.js
 * 自機「折鶴」 — 攻撃しない、ただ避けて生き延びる
 * ============================================================ */
'use strict';

const Player = {
  x: 240, y: 560,
  vx: 0, vy: 0,
  r: 2,                  // 当たり判定半径(極小)
  alive: true,
  invuln: 0,             // 無敵フレーム
  respawnT: 0,
  trailT: 0,
  flapT: 0,
  tilt: 0,
  moved: 0,              // 今フレーム移動したか

  init() {
    this.x = G.W / 2; this.y = 566;
    this.vx = 0; this.vy = 0;
    this.alive = true; this.invuln = 90; this.respawnT = 0;
  },

  update() {
    if (!this.alive) {
      if (this.respawnT > 0) {
        this.respawnT--;
        if (this.respawnT === 0) {
          this.alive = true;
          this.x = G.W / 2; this.y = 566;
          this.invuln = Math.round(60 * G.run.diff.invulnSpawn);
          SFX.respawn();
        }
      }
      return;
    }
    const diff = G.run.diff;
    let mx = 0, my = 0;
    if (G.isTouch && Input.touchActive) {
      /* 相対ドラッグ: 感度をやや増幅、低速時は繊細に */
      const k = Input.focus ? 0.55 : 1.35;
      mx = Input.tdx * k; my = Input.tdy * k;
      Input.tdx = Input.tdy = 0;
    } else {
      const a = Input.axis();
      const sp = Input.focus ? diff.speedFocus : diff.speed;
      mx = a.x * sp; my = a.y * sp;
    }
    this.moved = (mx !== 0 || my !== 0);
    this.x = clamp(this.x + mx, G.PF.x0 + 6, G.PF.x1 - 6);
    this.y = clamp(this.y + my, G.PF.y0 + 8, G.PF.y1 - 8);
    this.tilt = lerp(this.tilt, clamp(mx * 0.14, -0.3, 0.3), 0.2);
    if (this.invuln > 0) this.invuln--;
    this.flapT += (this.moved ? 1 : 0.55);
    /* 光の残滓トレイル */
    this.trailT++;
    if (this.trailT >= 3) {
      this.trailT = 0;
      Particles.add({
        x: this.x - this.vx * 2 + rnd(-3, 3), y: this.y + 6 + rnd(-2, 2),
        vx: rnd(-0.2, 0.2), vy: rnd(0.3, 0.8),
        life: 26, t: -1, c: 'cyan', kind: 'glow', size: rnd(4, 8),
      });
    }
  },

  hit() {
    if (!this.alive || this.invuln > 0) return false;
    this.alive = false;
    this.respawnT = 75;
    G.run.hits++;
    G.run.lives--;
    G.run.noMiss = false;
    FX.shake(7, 0.5);
    FX.flash('#ff4050', 0.55, 0.24);
    FX.slowmoT = 24;
    Particles.burst(this.x, this.y, 'red', 22, 2.6);
    Particles.ring(this.x, this.y, 60, 'red');
    SFX.hit();
    vibrate(120);
    Bullets.clearRadius(this.x, this.y, 130, true);
    if (G.run.lives < 0) { G.run.lives = 0; }
    return true;
  },

  draw(x, t) {
    if (!this.alive) {
      /* 復帰カウント: 光の集約 */
      if (this.respawnT > 10 && this.respawnT < 70) {
        const pr = 1 - this.respawnT / 70;
        x.save();
        x.globalCompositeOperation = 'lighter';
        x.globalAlpha = pr * 0.8;
        x.drawImage(S.glow.cyan, G.W / 2 - 40 * (1 - pr), 566 - 40 * (1 - pr), 80 * (1 - pr), 80 * (1 - pr));
        x.restore();
      }
      return;
    }
    const blinkOff = this.invuln > 0 && ((this.invuln >> 2) % 2 === 0) && this.invuln < 200;
    if (blinkOff) return;
    const px = Math.round(this.x), py = Math.round(this.y);
    /* 羽ばたきフレーム */
    const fr = (this.flapT >> 4) % 2;
    x.save();
    /* 光輪 */
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = 0.5 + Math.sin(t * 3) * 0.12;
    x.drawImage(S.craneGlow, px - 26, py - 26);
    x.restore();
    x.save();
    x.translate(px, py);
    x.rotate(this.tilt);
    x.drawImage(S.crane[fr], -10, -9);
    x.restore();
    /* 低速時: 当たり判定表示 */
    if (Input.focus || G.isTouch) {
      const pulse = 1 + Math.sin(t * 6) * 0.12;
      x.save();
      x.globalAlpha = 0.9;
      x.drawImage(S.hitDot, px - 9 * pulse, py - 9 * pulse, 18 * pulse, 18 * pulse);
      x.restore();
    }
    /* 無敵シールド */
    if (this.invuln > 0 && this.invuln < 400) {
      x.save();
      x.globalAlpha = Math.min(0.85, this.invuln / 30);
      x.translate(px, py);
      x.rotate(t * 2.2);
      x.drawImage(S.shield, -22, -22);
      x.restore();
    }
    /* フェーズ7: 折鶴の灯り半径を強調(常夜) */
    if (G.run && G.run.phaseIdx === 6 && G.state === 'play') {
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = 0.34 + Math.sin(t * 2.4) * 0.06;
      x.drawImage(S.glow.cyan, px - 40, py - 40, 80, 80);
      x.restore();
    }
  },
};
