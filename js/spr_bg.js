/* ============================================================
 * 常夜桜 spr_bg.js
 * 背景: 常夜の空 / 満月 / 遠山 / 桜の杜・石灯籠 / 霧 / 星空
 * すべてコード生成のドット絵(自作)
 * ============================================================ */
'use strict';

function buildBackground() {
  const W = G.W, H = G.H;
  const bg = S.bg = {};

  /* ===== ベース背景 (480x640, 固定シーン) ===== */
  const base = makeCanvas(W, H);
  const x = ctx2(base);

  /* --- 空のグラデーション: 頂の深藍→藍紫→地平の茜がかった紫 --- */
  let sky = x.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0.00, '#04060f');
  sky.addColorStop(0.22, '#0a0e26');
  sky.addColorStop(0.45, '#141442');
  sky.addColorStop(0.62, '#241847');
  sky.addColorStop(0.74, '#331c49');
  sky.addColorStop(0.85, '#2a1838');
  sky.addColorStop(1.00, '#150e20');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);

  /* --- 満月ハロー (後で呼吸させるため別レイヤでも持つ) --- */
  const moonCX = 352, moonCY = 118, moonR = 64;
  let halo = x.createRadialGradient(moonCX, moonCY, moonR * 0.6, moonCX, moonCY, moonR * 2.6);
  halo.addColorStop(0, 'rgba(255,244,210,0.28)');
  halo.addColorStop(0.5, 'rgba(240,220,255,0.10)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = halo; x.fillRect(moonCX - 220, moonCY - 220, 440, 440);

  /* --- 月本体: 砥粉色・斑模様 --- */
  const moonRnd = mulberry32(20241015);
  x.fillStyle = '#f2ecd4';
  circle(x, moonCX, moonCY, moonR); x.fill();
  for (let i = 0; i < 13; i++) { // 月の海(大きく柔らかい斑)
    const a = moonRnd() * TAU, d = moonRnd() * moonR * 0.62;
    const r = 11 + moonRnd() * 20;
    x.fillStyle = `rgba(200,190,158,${0.07 + moonRnd() * 0.08})`;
    circle(x, moonCX + Math.cos(a) * d, moonCY + Math.sin(a) * d * 0.86, r); x.fill();
  }
  for (let i = 0; i < 8; i++) { // 微細斑
    const a = moonRnd() * TAU, d = moonRnd() * moonR * 0.7;
    x.fillStyle = `rgba(188,178,150,${0.05 + moonRnd() * 0.05})`;
    circle(x, moonCX + Math.cos(a) * d, moonCY + Math.sin(a) * d, 3 + moonRnd() * 6); x.fill();
  }
  /* 兎影(縁側の薄い影) */
  x.fillStyle = 'rgba(180,170,140,0.20)';
  circle(x, moonCX + 18, moonCY - 8, 13); x.fill();
  circle(x, moonCX + 30, moonCY - 22, 7); x.fill();
  circle(x, moonCX + 6, moonCY - 26, 8); x.fill();
  /* 月の縁の階調 */
  x.fillStyle = 'rgba(255,250,230,0.5)';
  circle(x, moonCX - 8, moonCY - 10, moonR * 0.82); x.fill();
  x.fillStyle = 'rgba(120,110,140,0.25)';
  x.beginPath(); x.arc(moonCX, moonCY, moonR, TAU * 0.02, TAU * 0.24); x.arc(moonCX, moonCY, moonR - 3, TAU * 0.24, TAU * 0.02, true); x.closePath(); x.fill();

  /* --- 月雲: 月を横切る薄雲 --- */
  const cloudRnd = mulberry32(77);
  for (let i = 0; i < 5; i++) {
    const cy = moonCY - 40 + i * 22 + cloudRnd() * 10;
    const cw = 90 + cloudRnd() * 160;
    x.fillStyle = `rgba(80,80,140,${0.10 + cloudRnd() * 0.10})`;
    for (let k = 0; k < 8; k++) {
      const px = moonCX - cw / 2 + (cw / 8) * k + cloudRnd() * 20 - 10;
      circle(x, px, cy + cloudRnd() * 6 - 3, 10 + cloudRnd() * 14); x.fill();
    }
  }

  /* --- 遠山 (moonlit rim) 2層 --- */
  const drawRidge = (yBase, amp, seed, colFill, colRim) => {
    const rr = mulberry32(seed);
    const pts = [];
    for (let px = -20; px <= W + 20; px += 14) {
      pts.push([px, yBase + Math.sin(px * 0.013 + seed) * amp * 0.6 + rr() * amp * 0.5]);
    }
    x.fillStyle = colFill;
    x.beginPath(); x.moveTo(-20, H);
    for (const [px, py] of pts) x.lineTo(px, py);
    x.lineTo(W + 20, H); x.closePath(); x.fill();
    x.fillStyle = colRim;
    for (const [px, py] of pts) x.fillRect(Math.round(px) - 3, Math.round(py), 6, 2);
  };
  drawRidge(340, 46, 3, '#10142e', 'rgba(150,150,210,0.28)');
  drawRidge(392, 56, 9, '#0c0f26', 'rgba(140,140,200,0.20)');

  /* --- 鳥居のシルエット(左の丘上) --- */
  x.fillStyle = '#070a18';
  const tx = 66, ty = 330;
  x.fillRect(tx - 30, ty - 44, 64, 6);   // 笠木
  x.fillRect(tx - 26, ty - 38, 56, 4);   // 貫
  x.fillRect(tx - 22, ty - 38, 7, 44);   // 柱
  x.fillRect(tx + 17, ty - 38, 7, 44);
  x.fillStyle = 'rgba(255,120,160,0.14)';
  x.fillRect(tx - 30, ty - 46, 64, 2);

  /* --- 桜の杜(中下段): シルエット + 月縁の桜色 --- */
  const treeRnd = mulberry32(555);
  x.fillStyle = '#0a0d1f';
  x.fillRect(0, 438, W, H - 438);
  for (let px = 0; px < W; px += 10) { // 梢のうねり
    const hgt = 30 + Math.sin(px * 0.05) * 12 + treeRnd() * 22;
    x.fillStyle = '#0a0d1f';
    circle(x, px, 448 - hgt * 0.4, 16 + treeRnd() * 14); x.fill();
  }
  for (let px = 0; px < W; px += 8) { // 桜色の縁照らし
    const hgt = 30 + Math.sin(px * 0.05) * 12 + 10;
    x.fillStyle = `rgba(255,140,190,${0.05 + treeRnd() * 0.06})`;
    circle(x, px + 4, 448 - hgt * 0.55 - 5, 12); x.fill();
  }

  /* --- 石灯籠 2基 + 火袋の灯 --- */
  const lantern = (lx, ly, s) => {
    x.fillStyle = '#0d1126';
    x.fillRect(lx - 5 * s, ly - 26 * s, 10 * s, 4 * s);   // 笠
    x.fillRect(lx - 4 * s, ly - 22 * s, 8 * s, 8 * s);    // 火袋
    x.fillRect(lx - 2 * s, ly - 14 * s, 4 * s, 10 * s);   // 竿
    x.fillRect(lx - 5 * s, ly - 4 * s, 10 * s, 4 * s);    // 台
    x.fillStyle = '#1b2140';
    x.fillRect(lx - 5 * s, ly - 26 * s, 10 * s, 2 * s);
  };
  lantern(48, 470, 2); lantern(430, 486, 2.4); lantern(330, 452, 1.6);
  bg.lanterns = [{ x: 48, y: 470 - 36, s: 2 }, { x: 430, y: 486 - 43, s: 2.4 }, { x: 330, y: 452 - 29, s: 1.6 }];

  /* --- 前景: 桜の枝 (上端・左右から垂れる) --- */
  x.fillStyle = '#05070f';
  x.fillRect(0, 0, 58, 4);
  for (let i = 0; i < 34; i++) { // 左上の枝垂れ桜
    const t = i / 34;
    const bx = 4 + t * 120, by = 2 + Math.sin(t * 2.4) * 8 + t * 26;
    x.fillRect(Math.round(bx), Math.round(by), 3, 3);
    if (i % 3 === 0) { x.fillRect(Math.round(bx) + 2, Math.round(by) + 4, 2, 30 * (1 - t) + 6); }
  }
  const blRnd = mulberry32(31);
  for (let i = 0; i < 90; i++) { // 房の花(暗いピンクの点群)
    const t = blRnd();
    const bx = 4 + t * 120, by = 2 + Math.sin(t * 2.4) * 8 + t * 26;
    const len = 6 + blRnd() * 30 * (1 - t + 0.3);
    x.fillStyle = `rgba(${200 + blRnd() * 55 | 0},${100 + blRnd() * 60 | 0},${150 + blRnd() * 50 | 0},${0.10 + blRnd() * 0.16})`;
    x.fillRect(Math.round(bx + blRnd() * 6 - 3), Math.round(by + 4 + blRnd() * len), 2, 2);
  }

  /* --- 下端の水面・映り込み --- */
  let water = x.createLinearGradient(0, H - 120, 0, H);
  water.addColorStop(0, 'rgba(6,8,18,0)');
  water.addColorStop(1, '#05070e');
  x.fillStyle = water; x.fillRect(0, H - 120, W, 120);
  x.fillStyle = 'rgba(242,236,212,0.10)'; // 月の映り
  const wr = mulberry32(88);
  for (let i = 0; i < 26; i++) {
    const wy = H - 110 + i * 4 + wr() * 2;
    const wwd = 26 - i + wr() * 14;
    x.fillRect(moonCX - wwd / 2 + wr() * 10 - 5 - H + wy * 0.4, wy, wwd, 1);
  }

  bg.base = base;

  /* ===== 星 (点滅は実行時) ===== */
  const starRnd = mulberry32(404);
  bg.stars = [];
  for (let i = 0; i < 90; i++) {
    bg.stars.push({
      x: starRnd() * W, y: starRnd() * H * 0.62,
      r: starRnd() < 0.12 ? 2 : 1,
      ph: starRnd() * TAU, sp: 0.5 + starRnd() * 1.6,
      big: starRnd() < 0.10,
      white: starRnd() < 0.6,
    });
  }

  /* ===== 霧バンド (横に漂う・実行時スクロール) ===== */
  const mkMist = (seed, hgt, alpha) => {
    const c = makeCanvas(W * 2, hgt), xx = ctx2(c);
    const rr = mulberry32(seed);
    for (let i = 0; i < 60; i++) {
      const px = rr() * W * 2, py = rr() * hgt;
      const r = 18 + rr() * 42;
      const g = xx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(150,150,220,${alpha})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      xx.fillStyle = g; xx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    return c;
  };
  bg.mistA = mkMist(12, 70, 0.05);
  bg.mistB = mkMist(34, 46, 0.04);

  /* ===== 月ハロー(呼吸用・加算) ===== */
  if (!S.moonHalo) {
    const R = 120, c = makeCanvas(R * 2, R * 2), xx = ctx2(c);
    const g = xx.createRadialGradient(R, R, 10, R, R, R);
    g.addColorStop(0, 'rgba(255,246,214,0.32)');
    g.addColorStop(0.5, 'rgba(240,215,255,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    xx.fillStyle = g; xx.fillRect(0, 0, R * 2, R * 2);
    S.moonHalo = c;
    S.moonHaloCore = { x: moonCX, y: moonCY, r: moonR };
  }
  /* ===== 灯籠の火光(加算) ===== */
  const LR = 26;
  const lc = makeCanvas(LR * 2, LR * 2), lx2 = ctx2(lc);
  const lg = lx2.createRadialGradient(LR, LR, 2, LR, LR, LR);
  lg.addColorStop(0, 'rgba(255,190,90,0.7)');
  lg.addColorStop(0.4, 'rgba(255,150,60,0.25)');
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  lx2.fillStyle = lg; lx2.fillRect(0, 0, LR * 2, LR * 2);
  bg.lampGlow = lc;

  /* ===== ビネット ===== */
  const vc = makeCanvas(W, H), vx = ctx2(vc);
  let vg = vx.createRadialGradient(W / 2, H * 0.46, H * 0.34, W / 2, H * 0.52, H * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.75, 'rgba(2,3,10,0.28)');
  vg.addColorStop(1, 'rgba(1,2,8,0.62)');
  vx.fillStyle = vg; vx.fillRect(0, 0, W, H);
  bg.vig = vc;
  /* フェーズ7「常夜ノ帳」用の闇ベール */
  const dc = makeCanvas(W, H), dx2 = ctx2(dc);
  dx2.fillStyle = 'rgba(4,4,18,0.5)'; dx2.fillRect(0, 0, W, H);
  let dg = dx2.createLinearGradient(0, 0, 0, H);
  dg.addColorStop(0, 'rgba(10,6,30,0.5)');
  dg.addColorStop(0.5, 'rgba(4,4,20,0.15)');
  dg.addColorStop(1, 'rgba(2,2,12,0.6)');
  dx2.fillStyle = dg; dx2.fillRect(0, 0, W, H);
  bg.darkVeil = dc;
}

/* 背景描画 (実行時: twinkle・霧・呼吸) */
function drawBackground(x, t, opt = {}) {
  const bg = S.bg;
  x.drawImage(bg.base, 0, 0);
  /* 月ハロー呼吸 */
  const br = 1 + Math.sin(t * 0.6) * 0.06;
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.globalAlpha = 0.8 + Math.sin(t * 0.6) * 0.2;
  const hc = S.moonHaloCore;
  x.drawImage(S.moonHalo, hc.x - 120 * br, hc.y - 120 * br, 240 * br, 240 * br);
  /* 星瞬き */
  for (const st of bg.stars) {
    const a = 0.25 + (Math.sin(t * st.sp + st.ph) * 0.5 + 0.5) * 0.75;
    x.globalAlpha = a * (opt.dim ? 0.5 : 1);
    x.fillStyle = st.white ? '#dfe8ff' : '#9fb2ff';
    x.fillRect(st.x | 0, st.y | 0, st.r, st.r);
    if (st.big) {
      x.globalAlpha = a * 0.55;
      x.fillRect((st.x | 0) - 2, st.y | 0, 1, 1); x.fillRect((st.x | 0) + 3, st.y | 0, 1, 1);
      x.fillRect(st.x | 0, (st.y | 0) - 2, 1, 1); x.fillRect(st.x | 0, (st.y | 0) + 3, 1, 1);
    }
  }
  /* 灯籠の灯ゆらぎ */
  for (const l of bg.lanterns) {
    x.globalAlpha = 0.7 + Math.sin(t * 3.1 + l.x) * 0.3;
    x.drawImage(bg.lampGlow, l.x - 26 * l.s / 2, l.y + 6 - 26 * l.s / 2, 26 * l.s, 26 * l.s);
  }
  x.restore();
  /* 霧 */
  x.save();
  x.globalAlpha = 0.9;
  const mw = G.W;
  x.drawImage(bg.mistA, -(((t * 6) % mw) | 0), 300);
  x.drawImage(bg.mistA, mw - (((t * 6) % mw) | 0), 300);
  x.drawImage(bg.mistB, -(((t * 11 + 200) % mw) | 0), 470);
  x.drawImage(bg.mistB, mw - (((t * 11 + 200) % mw) | 0), 470);
  x.restore();
  if (opt.dark) { x.drawImage(bg.darkVeil, 0, 0); }
  x.drawImage(bg.vig, 0, 0);
}
