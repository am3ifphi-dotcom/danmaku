/* ============================================================
 * 常夜桜 ui.js
 * HUD / 幕 / メニュー / タッチUI
 * ============================================================ */
'use strict';

const UI = {
  menuIdx: 0,
  bannerMain: null, bannerSub: null, bannerT: 0, bannerDur: 150,
  smallT: 0, smallTxt: '',
  prevEdges: {},

  /* ---------- 幕 ---------- */
  banner(main, sub, dur = 150) {
    this.bannerMain = main; this.bannerSub = sub;
    this.bannerT = dur; this.bannerDur = dur;
  },
  bannerSmall(txt) { this.smallTxt = txt; this.smallT = 130; },

  /* ---------- 状態遷移 ---------- */
  enter(state) {
    this.menuIdx = 0;
    G.touchUI = [];
    if (state === 'gameover') this._goT = G.frame;
  },

  /* ---------- 各種更新 (input) ---------- */
  update() {
    const confirm = Input.pressed('z') || Input.pressed('Enter') || Input.pressed('tap');
    const up = Input.pressed('ArrowUp') || Input.pressed('w');
    const down = Input.pressed('ArrowDown') || Input.pressed('s');
    const back = Input.pressed('x') || Input.pressed('Escape');

    switch (G.state) {
      case 'title': {
        const items = ['はじめる', 'あそびかた', `難易度: ${G.diff}`, `音: ${AudioSys.musicOn ? 'ON' : 'OFF'}`];
        if (up) { this.menuIdx = (this.menuIdx + items.length - 1) % items.length; SFX.ui(); }
        if (down) { this.menuIdx = (this.menuIdx + 1) % items.length; SFX.ui(); }
        if (confirm) this._titleAction(this.menuIdx % items.length);
        break;
      }
      case 'difficulty': {
        if (up) { this.menuIdx = (this.menuIdx + 3) % 4; SFX.ui(); }
        if (down) { this.menuIdx = (this.menuIdx + 1) % 4; SFX.ui(); }
        if (confirm) {
          if (this.menuIdx < 3) {
            G.diff = ['EASY', 'NORMAL', 'HARD'][this.menuIdx];
            Music.stop();
            Stages.startRun(G.diff);
          } else { G.state = 'title'; this.enter('title'); }
          SFX.confirm();
        }
        if (back) { G.state = 'title'; this.enter('title'); SFX.ui(); }
        break;
      }
      case 'howto': {
        if (confirm || back) { G.state = 'title'; this.enter('title'); SFX.ui(); }
        break;
      }
      case 'pause': {
        const items = ['再開する', 'はじめから', 'タイトルへ'];
        if (up) { this.menuIdx = (this.menuIdx + items.length - 1) % items.length; SFX.ui(); }
        if (down) { this.menuIdx = (this.menuIdx + 1) % items.length; SFX.ui(); }
        if (confirm) {
          if (this.menuIdx === 0) G.resumeGame();
          else if (this.menuIdx === 1) { G.paused = false; Music.stop(); Stages.startRun(G.run.diffKey); }
          else { G.paused = false; G.state = 'title'; this.enter('title'); Music.start('title'); Music.bossPhase = 0; }
          SFX.confirm();
        }
        if (Input.pressed('Escape') || Input.pressed('p')) { G.resumeGame(); }
        break;
      }
      case 'result': {
        const items = ['もう一度 耐久する', '難易度を選ぶ', 'タイトルへ'];
        if (up) { this.menuIdx = (this.menuIdx + items.length - 1) % items.length; SFX.ui(); }
        if (down) { this.menuIdx = (this.menuIdx + 1) % items.length; SFX.ui(); }
        if (confirm) {
          if (this.menuIdx === 0) { Music.stop(); Stages.startRun(G.run.diffKey); }
          else if (this.menuIdx === 1) { G.state = 'difficulty'; this.menuIdx = ['EASY', 'NORMAL', 'HARD'].indexOf(G.run.diffKey); }
          else { G.state = 'title'; this.enter('title'); }
          SFX.confirm();
        }
        break;
      }
      case 'gameover': {
        if (confirm && this._goT !== undefined && G.frame - this._goT > 30) {
          G.state = 'difficulty'; this.menuIdx = ['EASY', 'NORMAL', 'HARD'].indexOf(G.run.diffKey);
          SFX.confirm();
        }
        break;
      }
    }

    /* タッチUI処理 */
    this._touchUpdate(confirm);
    if (this.bannerT > 0) this.bannerT--;
    if (this.smallT > 0) this.smallT--;
  },

  _titleAction(idx) {
    if (idx === 0) { G.state = 'difficulty'; this.menuIdx = ['EASY', 'NORMAL', 'HARD'].indexOf(G.diff); Music.start('title'); SFX.confirm(); }
    else if (idx === 1) { G.state = 'howto'; this.enter('howto'); SFX.confirm(); }
    else if (idx === 2) { const D = ['EASY', 'NORMAL', 'HARD']; G.diff = D[(D.indexOf(G.diff) + 1) % 3]; SFX.confirm(); }
    else if (idx === 3) { AudioSys.setAll(!(AudioSys.musicOn || AudioSys.sfxOn)); SFX.confirm(); }
  },

  /* ---------- 描画: HUD ---------- */
  drawHUD(x) {
    const run = G.run;
    /* 上段帯 */
    x.save();
    x.fillStyle = 'rgba(4,6,16,0.72)';
    x.fillRect(0, 0, G.W, 44);
    x.fillStyle = 'rgba(140,150,220,0.35)';
    x.fillRect(0, 44, G.W, 1);

    /* SCORE & 難易度 */
    drawText(x, String(Math.round(run.score)).padStart(7, '0'), 12, 6, { size: 16, color: '#e8ecff', shadowColor: '#000' });
    drawText(x, `${run.diff.label}`, 12, 26, { size: 16, color: run.diff.color, shadow: false });

    /* 章の輪(中央) */
    const n = PHASES.length, pcx = G.W / 2 - (n - 1) * 11, py = 14;
    for (let i = 0; i < n; i++) {
      const done = i < run.phaseIdx, cur = i === run.phaseIdx;
      x.fillStyle = done ? 'rgba(150,160,220,0.5)' : (cur ? S.boss[run.phaseIdx]?.pal.acc || '#fff' : 'rgba(90,95,140,0.4)');
      const puls = cur ? 1 + Math.sin(G.time * 5) * 0.25 : 1;
      x.save();
      x.translate(pcx + i * 22, py); x.rotate(Math.PI / 4);
      const w = (cur ? 8 : 6) * puls;
      x.fillRect(-w / 2, -w / 2, w, w);
      x.restore();
    }
    /* 章進行バー */
    const durF = run.seq === 'fight' ? Stages.phaseDurF : 1;
    const pr = run.seq === 'fight' ? clamp(run.phF / durF, 0, 1) : 0;
    x.fillStyle = 'rgba(90,95,140,0.5)';
    x.fillRect(G.W / 2 - 70, 27, 140, 2);
    x.fillStyle = S.boss[run.phaseIdx]?.pal.acc || '#ffd75e';
    x.fillRect(G.W / 2 - 70, 27, 140 * pr, 2);
    /* 章名 */
    if (run.phaseIdx >= 0) {
      drawText(x, PHASES[run.phaseIdx].name, G.W / 2, 31, { size: 16, align: 'center', color: '#cfd6ff', shadowColor: '#000' });
    }

    /* 残り時間(右上・大) */
    const tLeft = Math.max(0, run.remain);
    const danger = tLeft < 30.5;
    const pulse = danger ? 1 + Math.sin(G.time * 8) * 0.06 : 1;
    x.save();
    x.translate(G.W - 14, 6 + 14 * (pulse - 1));
    x.scale(pulse, pulse);
    drawText(x, fmtTime(tLeft), 0, 0, {
      size: 32, align: 'right',
      color: danger ? '#ff7a7a' : '#ffe9a8',
      glow: danger ? 'rgba(255,60,60,0.8)' : 'rgba(255,215,94,0.45)',
      shadow: false,
    });
    x.restore();
    drawText(x, '残時間', G.W - 14, 10, { size: 16, align: 'right', color: 'rgba(200,205,240,0.6)', shadow: false });

    x.restore();

    /* 残機(中央下・左) */
    for (let i = 0; i < run.lives; i++) {
      const spr = S.crane[0];
      x.drawImage(spr, 12 + i * 22, G.H - 26, 16, 14);
    }
    /* グレイズ */
    drawText(x, `GRAZE ${run.graze}`, G.W - 12, G.H - 24, { size: 16, align: 'right', color: '#9fd8ff', shadow: false });
  },

  /* ---------- 幕 ---------- */
  drawBanners(x) {
    if (this.bannerT > 0) {
      const tIn = this.bannerDur - this.bannerT;
      const a = Math.min(1, tIn / 18, this.bannerT / 24);
      x.save();
      x.globalAlpha = a;
      const y = 268;
      x.fillStyle = 'rgba(2,3,10,0.55)';
      x.fillRect(0, y - 14, G.W, 74);
      x.fillStyle = S.boss[G.run?.phaseIdx ?? 0]?.pal.acc || '#ffd75e';
      x.fillRect(G.W / 2 - 150, y - 14, 300, 2);
      x.fillRect(G.W / 2 - 150, y + 58, 300, 2);
      drawText(x, this.bannerMain, G.W / 2, y, { size: 32, align: 'center', color: '#f4f0ff', glow: 'rgba(160,150,255,0.5)' });
      drawText(x, this.bannerSub, G.W / 2, y + 38, { size: 16, align: 'center', color: '#b9c2f0', shadow: false });
      x.restore();
    }
    if (this.smallT > 0) {
      const a = Math.min(1, this.smallT / 30);
      x.save();
      x.globalAlpha = a * 0.9;
      drawText(x, this.smallTxt, G.W / 2, G.H - 120, { size: 16, align: 'center', color: '#cfd6ff', shadowColor: '#000' });
      x.restore();
    }
  },

  /* ---------- 警告 / イントロ ---------- */
  drawWarning(x, seqT) {
    const blink = Math.sin(seqT * 0.25) > 0;
    x.save();
    x.fillStyle = 'rgba(2,2,8,0.82)';
    x.fillRect(0, 0, G.W, G.H);
    /* 赤帯 */
    x.fillStyle = 'rgba(140,20,40,0.5)';
    x.fillRect(0, 180, G.W, 4);
    x.fillRect(0, G.H - 184, G.W, 4);
    x.fillStyle = 'rgba(255,60,80,0.9)';
    for (let i = 0; i < 12; i++) {
      const xx = (i * 44 + seqT * 2) % (G.W + 44) - 22;
      x.fillRect(xx, 182, 22, 2);
      x.fillRect(G.W - xx, G.H - 184, 22, 2);
    }
    if (blink) {
      drawText(x, '警告', G.W / 2, 240, { size: 32, align: 'center', color: '#ff4050', glow: 'rgba(255,40,60,0.9)' });
      drawText(x, '強大な月の気配。結界は間もなく破られる', G.W / 2, 300, { size: 16, align: 'center', color: '#ffb0b8' });
    }
    x.restore();
  },
  drawIntro(x, seqT) {
    x.save();
    const a = clamp(seqT / 30, 0, 1) * clamp((165 - seqT) / 30, 0, 1);
    x.globalAlpha = Math.min(1, a + 0.2);
    x.fillStyle = 'rgba(2,3,10,0.4)';
    x.fillRect(0, 400, G.W, 90);
    drawText(x, '月の巫女 ツクヨミ', G.W / 2, 412, { size: 32, align: 'center', color: '#fff6d8', glow: 'rgba(255,220,120,0.7)' });
    drawText(x, '— TSUKUYOMI, the Miko of the Eternal Night —', G.W / 2, 452, { size: 16, align: 'center', color: '#d8ccff', shadow: false });
    x.restore();
  },
  drawClear(x, seqT) {
    const a = clamp(seqT / 60, 0, 1);
    x.save();
    x.globalAlpha = a;
    if (seqT > 30) {
      drawText(x, 'STAGE CLEAR', G.W / 2, 240, { size: 32, align: 'center', color: '#fff6d8', glow: 'rgba(255,220,120,0.9)' });
      drawText(x, '常夜は明け、桜は朝日に還る', G.W / 2, 288, { size: 16, align: 'center', color: '#ffe9c8', shadow: false });
    }
    x.restore();
  },
  drawDown(x, seqT) {
    const a = clamp(seqT / 60, 0, 1);
    x.save();
    x.globalAlpha = a;
    x.fillStyle = 'rgba(4,2,8,0.55)';
    x.fillRect(0, 0, G.W, G.H);
    if (seqT > 30) {
      drawText(x, '折鶴、堕つ', G.W / 2, 260, { size: 32, align: 'center', color: '#b9a8d8', glow: 'rgba(120,90,180,0.7)' });
      drawText(x, '月はなお、常夜にあり', G.W / 2, 306, { size: 16, align: 'center', color: '#8f88b8', shadow: false });
    }
    x.restore();
  },

  /* ---------- メニュー群 ---------- */
  _panel(x, cx, cy, w, h, accent) {
    x.save();
    x.fillStyle = 'rgba(6,8,20,0.82)';
    x.fillRect(cx - w / 2, cy - h / 2, w, h);
    x.strokeStyle = 'rgba(140,150,220,0.55)';
    x.lineWidth = 1;
    x.strokeRect(cx - w / 2 + 0.5, cy - h / 2 + 0.5, w - 1, h - 1);
    x.strokeStyle = accent || '#ffb7d5';
    x.strokeRect(cx - w / 2 + 3.5, cy - h / 2 + 3.5, w - 7, h - 7);
    x.restore();
  },

  drawTitle(x) {
    const t = G.time;
    /* ロゴ */
    x.save();
    const glow = 0.6 + Math.sin(t * 1.2) * 0.15;
    drawText(x, '常夜桜', G.W / 2, 150, { size: 32, align: 'center', color: '#ffd8ea', glow: `rgba(255,150,200,${glow})` });
    if (G.icon && G.icon.moon) {
      x.drawImage(G.icon.moon('#ffd8ea', 34), G.W / 2 - 118, 144);
      x.drawImage(G.icon.moon('#ffd8ea', 34), G.W / 2 + 84, 144);
      x.drawImage(G.icon.star('#ffe9a8', 18), G.W / 2 + 118, 152 + Math.sin(t * 2.2) * 2);
      x.drawImage(G.icon.star('#ffe9a8', 18), G.W / 2 - 136, 152 + Math.sin(t * 2.2 + 2) * 2);
    }
    drawText(x, '- TOKOYO-ZAKURA -', G.W / 2, 196, { size: 16, align: 'center', color: '#9fb2ff', shadow: false });
    /* 副題 */
    drawText(x, '月の巫女の弾幕を避け抜く、常夜の耐久譚', G.W / 2, 232, { size: 16, align: 'center', color: '#cfd6ff', shadowColor: '#000' });

    /* メニュー */
    const items = ['はじめる', 'あそびかた', `難易度: ${G.diff}`, `音: ${AudioSys.musicOn ? 'ON' : 'OFF'}`];
    const bx = G.W / 2, by = 320;
    G.touchUI = [];
    items.forEach((it, i) => {
      const sel = i === this.menuIdx;
      const yy = by + i * 46;
      this._menuItem(x, bx, yy, 280, 38, it, sel);
      G.touchUI.push(new UIButton(bx - 140, yy - 19, 280, 38, () => { this.menuIdx = i; this._titleAction(i); }, sel));
    });

    /* 記録 */
    x.globalAlpha = 0.9;
    const best = G.save.best;
    drawText(x, `BEST  春花:${best.EASY || 0}  夜桜:${best.NORMAL || 0}  常夜:${best.HARD || 0}`,
      G.W / 2, G.H - 62, { size: 16, align: 'center', color: '#aab4e8', shadow: false });
    x.restore();
  },

  drawDifficulty(x) {
    drawText(x, '難易度を選ぶ', G.W / 2, 90, { size: 32, align: 'center', color: '#e8ecff', glow: 'rgba(140,160,255,0.4)' });
    const defs = [
      ['EASY', '春花', '弾・遅め/隙間広め/残機5。弾幕で遊ぶ第一歩', DIFFS.EASY.color],
      ['NORMAL', '夜桜', '標準の密度と流れ。本作の基準体験', DIFFS.NORMAL.color],
      ['HARD', '常夜', '高密度・狭隙間・残機2。巫女の本気', DIFFS.HARD.color],
    ];
    G.touchUI = [];
    defs.forEach((d, i) => {
      const y = 200 + i * 108, sel = i === this.menuIdx;
      this._panel(x, G.W / 2, y, 380, 92, d[3]);
      if (sel) {
        x.fillStyle = 'rgba(255,255,255,0.05)';
        x.fillRect(G.W / 2 - 187, y - 43, 374, 86);
        x.fillStyle = d[3];
        x.fillRect(G.W / 2 - 190, y - 44, 3, 88);
      }
      drawText(x, `${d[0]} - ${d[1]}`, G.W / 2, y - 30, { size: 32, align: 'center', color: d[3] });
      drawText(x, d[2], G.W / 2, y + 8, { size: 16, align: 'center', color: '#cfd6ff', shadow: false });
      const b = G.save.best[d[0]];
      if (b) drawText(x, `BEST ${b}${G.save.cleared[d[0]] ? '  踏破済' : ''}`, G.W / 2, y + 28, { size: 16, align: 'center', color: '#8f9ad0', shadow: false });
      G.touchUI.push(new UIButton(G.W / 2 - 190, y - 46, 380, 92, () => {
        G.diff = ['EASY', 'NORMAL', 'HARD'][i]; Music.stop(); Stages.startRun(G.diff); SFX.confirm();
      }, sel));
    });
    const backSel = this.menuIdx === 3;
    this._menuItem(x, G.W / 2, 530, 220, 34, 'もどる', backSel);
    G.touchUI.push(new UIButton(G.W / 2 - 110, 513, 220, 34, () => { G.state = 'title'; this.enter('title'); SFX.ui(); }, backSel));
    drawText(x, 'Z: 決定 / X: もどる', G.W / 2, G.H - 30, { size: 16, align: 'center', color: '#8f9ad0', shadow: false });
  },

  drawHowto(x) {
    drawText(x, 'あそびかた', G.W / 2, 60, { size: 32, align: 'center', color: '#e8ecff' });
    this._panel(x, G.W / 2, 300, 420, 390, '#9fd8ff');
    const lines = [
      ['目的', '月の巫女の弾幕を、時間いっぱい避け抜く。', '#ffd8ea'],
      ['', '自機は攻撃しない。生き延びることが勝利。', '#cfd6ff'],
      ['', '', ''],
      ['移動', '十字キー / WASD (斜め移動可)', '#e8ecff'],
      ['低速', 'Shift … 精密移動＋当たり判定を表示', '#e8ecff'],
      ['', 'おなじみの「目押し」に必須の技。', '#9fb2ff'],
      ['決定', 'Z / Enter / タップ', '#e8ecff'],
      ['中断', 'Esc / P … ポーズ', '#e8ecff'],
      ['音', 'N: BGM切替  M: 効果音切替', '#e8ecff'],
      ['', '', ''],
      ['被弾', '残機-1。無敵時間あり。0で常夜へ帰還', '#ffb0b8'],
      ['かすり', '弾にギリギリ寄せると GRAZE が増える', '#9fd8ff'],
      ['', '右上の残時間が0になるまでに8章すべてを', '#cfd6ff'],
      ['', '耐久すればクリア。幕間に弾は花弁へ還る。', '#cfd6ff'],
    ];
    let yy = 130;
    for (const [k, v, c] of lines) {
      if (k) { drawText(x, `【${k}】`, 64, yy, { size: 16, color: '#ffe9a8', shadow: false }); drawText(x, v, 150, yy, { size: 16, color: c, shadow: false }); }
      else if (v) drawText(x, v, 64, yy, { size: 16, color: c, shadow: false });
      yy += 22;
    }
    drawText(x, 'Z / タップで もどる', G.W / 2, G.H - 52, { size: 16, align: 'center', color: '#8f9ad0', shadow: false });
  },

  drawPause(x) {
    x.fillStyle = 'rgba(3,4,12,0.72)';
    x.fillRect(0, 0, G.W, G.H);
    drawText(x, '中断', G.W / 2, 190, { size: 32, align: 'center', color: '#cfd6ff' });
    const items = ['再開する', 'はじめから', 'タイトルへ'];
    G.touchUI = [];
    items.forEach((it, i) => {
      const sel = i === this.menuIdx;
      const yy = 280 + i * 46;
      this._menuItem(x, G.W / 2, yy, 260, 38, it, sel);
      G.touchUI.push(new UIButton(G.W / 2 - 130, yy - 19, 260, 38, () => {
        if (i === 0) G.resumeGame();
        else if (i === 1) { G.paused = false; Music.stop(); Stages.startRun(G.run.diffKey); }
        else { G.paused = false; G.state = 'title'; this.enter('title'); Music.start('title'); }
        SFX.confirm();
      }, sel));
    });
  },

  drawResult(x) {
    const r = G.run.result;
    x.fillStyle = 'rgba(3,4,12,0.78)';
    x.fillRect(0, 0, G.W, G.H);
    drawText(x, '耐久成功', G.W / 2, 70, { size: 32, align: 'center', color: '#fff6d8', glow: 'rgba(255,220,120,0.8)' });
    if (G.icon && G.icon.trophy) {
      x.drawImage(G.icon.trophy('#ffd75e', 30), G.W / 2 - 122, 64);
      x.drawImage(G.icon.trophy('#ffd75e', 30), G.W / 2 + 92, 64);
    }
    drawText(x, `— ${G.run.diff.label} / ${G.run.diff.jp} —`, G.W / 2, 116, { size: 16, align: 'center', color: DIFFS[G.run.diffKey].color, shadow: false });
    this._panel(x, G.W / 2, 280, 360, 240, '#ffd75e');
    const rows = [
      ['SCORE', String(r.score)],
      ['GRAZE', String(r.graze)],
      ['被弾', `${r.hits} 回${r.noMiss ? ' (ノーミス!)' : ''}`],
      ['同時弾数 最大', `${r.maxBullets}`],
      ['耐久時間', `${fmtTime(r.time)}`],
      ['RANK', r.rank],
    ];
    rows.forEach(([k, v], i) => {
      const yy = 178 + i * 34;
      drawText(x, k, G.W / 2 - 160, yy, { size: 16, color: '#9fb2ff', shadow: false });
      drawText(x, v, G.W / 2 + 160, yy, { size: k === 'RANK' ? 32 : 16, align: 'right', color: k === 'RANK' ? '#ffd75e' : '#f0f4ff', shadow: false });
    });
    if (r.noMiss) drawText(x, '♦ PERFECT DURABILITY ♦', G.W / 2, 396, { size: 16, align: 'center', color: '#7dffb8', glow: 'rgba(80,255,160,0.6)' });
    if (G.run.result && G.save.best[G.run.diffKey] === r.score) drawText(x, 'NEW RECORD!', G.W / 2, 420, { size: 16, align: 'center', color: '#ff9ec6', glow: 'rgba(255,120,170,0.7)' });
    const items = ['もう一度 耐久する', '難易度を選ぶ', 'タイトルへ'];
    G.touchUI = [];
    items.forEach((it, i) => {
      const sel = i === this.menuIdx;
      const yy = 480 + i * 42;
      this._menuItem(x, G.W / 2, yy, 300, 34, it, sel);
      G.touchUI.push(new UIButton(G.W / 2 - 150, yy - 17, 300, 34, () => {
        if (i === 0) { Music.stop(); Stages.startRun(G.run.diffKey); }
        else if (i === 1) { G.state = 'difficulty'; this.menuIdx = ['EASY', 'NORMAL', 'HARD'].indexOf(G.run.diffKey); }
        else { G.state = 'title'; this.enter('title'); }
        SFX.confirm();
      }, sel));
    });
  },

  drawGameover(x) {
    x.fillStyle = 'rgba(3,3,10,0.6)';
    x.fillRect(0, 0, G.W, G.H);
    drawText(x, '耐久失敗…', G.W / 2, 250, { size: 32, align: 'center', color: '#8f88b8' });
    drawText(x, 'Z: 修行を続ける(難易度選択へ)', G.W / 2, 320, { size: 16, align: 'center', color: '#cfd6ff', shadow: false });
    if (this._goT === undefined || G.state !== 'gameover') this._goT = G.frame;
  },

  _menuItem(x, cx, cy, w, h, label, sel) {
    x.save();
    if (sel) {
      x.fillStyle = 'rgba(255,183,213,0.10)';
      x.fillRect(cx - w / 2, cy - h / 2, w, h);
      x.strokeStyle = '#ffb7d5';
      x.strokeRect(cx - w / 2 + 0.5, cy - h / 2 + 0.5, w - 1, h - 1);
      x.fillStyle = '#ffb7d5';
      /* 桜カーソル */
      x.fillRect(cx - w / 2 - 18, cy - 1, 3, 3);
      x.fillRect(cx - w / 2 - 16, cy - 3, 1, 7);
      x.fillRect(cx - w / 2 - 20, cy - 1, 7, 2);
    }
    drawText(x, label, cx, cy - 8, { size: 16, align: 'center', color: sel ? '#fff' : '#b9c2f0', shadow: false });
    x.restore();
  },

  /* ---------- タッチ操作中UI ---------- */
  drawTouchPlayUI(x) {
    if (!G.isTouch || G.state !== 'play') return;
    G.touchUI = [];
    /* SLOW トグル */
    const bx = G.W - 88, by = G.H - 96;
    x.save();
    x.globalAlpha = 0.85;
    x.fillStyle = Input.touchSlow ? 'rgba(110,232,255,0.25)' : 'rgba(10,14,30,0.55)';
    x.fillRect(bx, by, 76, 56);
    x.strokeStyle = Input.touchSlow ? '#6ee8ff' : '#5a648f';
    x.strokeRect(bx + 0.5, by + 0.5, 75, 55);
    drawText(x, '低速', bx + 38, by + 8, { size: 16, align: 'center', color: Input.touchSlow ? '#bff2ff' : '#9fb2ff', shadow: false });
    x.drawImage(S.crane[0], bx + 28, by + 26, 20, 18);
    x.restore();
    G.touchUI.push(new UIButton(bx, by, 76, 56, () => { Input.touchSlow = !Input.touchSlow; SFX.move(); }));
    /* ポーズ */
    const px2 = 8, py2 = 50;
    x.save();
    x.globalAlpha = 0.8;
    x.fillStyle = 'rgba(10,14,30,0.55)';
    x.fillRect(px2, py2, 44, 34);
    x.strokeStyle = '#5a648f';
    x.strokeRect(px2 + 0.5, py2 + 0.5, 43, 33);
    x.fillStyle = '#cfd6ff';
    x.fillRect(px2 + 14, py2 + 9, 5, 16); x.fillRect(px2 + 25, py2 + 9, 5, 16);
    x.restore();
    G.touchUI.push(new UIButton(px2, py2, 44, 34, () => G.pauseGame()));
  },
  _touchUpdate() {
    /* タップはボタンが先に処理される (UIButton.hit内部でedge.tap消費) */
  },
};

/* タップ可能ボタン(座標=内部解像度) */
class UIButton {
  constructor(x, y, w, h, fn, sel) { this.x = x; this.y = y; this.w = w; this.h = h; this.fn = fn; this.sel = sel; }
  hit(px, py) {
    if (px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h) {
      this.fn();
      return true;
    }
    return false;
  }
}
UI.UIButton = UIButton;
