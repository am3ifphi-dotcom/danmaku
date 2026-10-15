/* ============================================================
 * 常夜桜 spr_boss.js
 * 月の巫女「ツクヨミ」スプライト工房
 * - 46x62 のドット絵パーツ(後髪/体/頭/御幣腕)をコード生成
 * - 8フェーズ分のパレット別スプライト
 * - 式神(紙人形)・狐面・光環(ハロー)も生成
 * ============================================================ */
'use strict';

/* フェーズカラー設計 (8形態) */
const BOSS_PAL = [
  { key: 'moon',   eye: '#3a2545', skin: '#ffd9c2', skinSh: '#eab9a0', kosode: '#f0eef8', kosodeSh: '#c5c1da', hakama: '#4a5fbe', hakamaSh: '#2e3c80', acc: '#8fc4ff', glow: 'cyan' },
  { key: 'sakura', eye: '#3a2545', skin: '#ffd9c2', skinSh: '#eab9a0', kosode: '#f8eef2', kosodeSh: '#d8c4d0', hakama: '#c94d82', hakamaSh: '#8a2f57', acc: '#ffb7d5', glow: 'pink' },
  { key: 'kitsune',eye: '#2a3050', skin: '#ffe0c8', skinSh: '#ecbd9c', kosode: '#eef4f8', kosodeSh: '#c2d0dc', hakama: '#3f7fc0', hakamaSh: '#27517e', acc: '#6ee8ff', glow: 'cyan' },
  { key: 'shide',  eye: '#43301a', skin: '#ffd9b8', skinSh: '#e8b494', kosode: '#f8f2e4', kosodeSh: '#d8ccb0', hakama: '#c99a2e', hakamaSh: '#8a6420', acc: '#ffd75e', glow: 'gold' },
  { key: 'sange',  eye: '#40204a', skin: '#ffd2cc', skinSh: '#e8acab', kosode: '#f4ecf4', kosodeSh: '#d0c2d2', hakama: '#9a3ec0', hakamaSh: '#62277e', acc: '#e39fff', glow: 'violet' },
  { key: 'tsuki',  eye: '#4a2a18', skin: '#ffd8bc', skinSh: '#eab294', kosode: '#f8f0e8', kosodeSh: '#d8ccb8', hakama: '#c06f30', hakamaSh: '#7e4518', acc: '#ffb35c', glow: 'amber' },
  { key: 'tokoyo', eye: '#ff4a5a', skin: '#e8d4e8', skinSh: '#c0a6c4', kosode: '#332844', kosodeSh: '#241c30', hakama: '#4a2358', hakamaSh: '#2e1438', acc: '#9a7aff', glow: 'violet' },
  { key: 'tsukuyomi', eye: '#8a5a10', skin: '#ffe8cc', skinSh: '#f0c19e', kosode: '#fbf8f0', kosodeSh: '#e0d8c4', hakama: '#e8c86a', hakamaSh: '#a8873a', acc: '#ffe9a8', glow: 'white' },
];
S.BOSS_PAL = BOSS_PAL;

const BW = 46, BH = 62;
const HAIR = '#261e44', HAIR_HI = '#4d3f82', HAIR_DK = '#161026';

function bossPix(x, i, j, col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }

/* ---- 後髪 (浮遊ロングヘア: 体より一回り大きく、月光の縁) ---- */
function drawHairBack(x, sway) { // sway: -1..1 毛先の揺れ位相
  for (let j = 0; j < BH; j++) {
    if (j < 1) continue;
    let half;
    if (j < 12) half = 12 + (j - 1) * 0.1;               // 頭部(顔より大きく)
    else if (j < 30) half = 13.2 - (j - 12) * 0.12;      // 肩〜背中
    else if (j < 50) half = 11 - (j - 30) * 0.16;        // 垂れ髪
    else half = Math.max(3.4, 7.8 - (j - 50) * 0.6);     // 毛先
    const wob = Math.sin(j * 0.35 + sway * 2.2) * (j > 30 ? 1.6 : 0.5);
    const cx = 23 + wob * (j > 34 ? 1 : 0.3);
    for (let i = Math.floor(cx - half); i <= Math.ceil(cx + half); i++) {
      if (i < 0 || i >= BW) continue;
      bossPix(x, i, j, HAIR);
    }
    /* 月光(右)の縁ハイライト2px / 左の陰 */
    const ri = Math.ceil(cx + half - 1);
    if (ri < BW) { bossPix(x, ri, j, HAIR_HI); if (j % 3 === 0 && ri - 1 >= 0) bossPix(x, ri - 1, j, HAIR_HI); }
    const li = Math.floor(cx - half);
    if (li >= 0) bossPix(x, li, j, HAIR_DK);
  }
  /* ツヤの流れ線 */
  for (let j = 8; j < 52; j += 2) {
    const wob = Math.sin(j * 0.35 + sway * 2.2) * 1.6;
    const i = Math.round(30 + wob * 0.6 - (j - 8) * 0.05);
    if (i > 0 && i < BW - 1) { bossPix(x, i, j, HAIR_HI); if (j % 4 === 0) bossPix(x, i + 1, j, HAIR_HI); }
    const i2 = Math.round(16 - wob * 0.5);
    if (i2 > 0) bossPix(x, i2, j, HAIR_DK);
  }
}

/* ---- 体 (小袖・袴・帯) ---- */
function drawBody(x, pal, pose = 0) {
  /* 袖 (左右に広がる小袖) */
  for (const side of [-1, 1]) {
    for (let j = 0; j < 20; j++) {
      const yy = 26 + j;
      const w = 6 + Math.sin(j * 0.4) * 1.2 + j * 0.12;
      const cx = 23 + side * (10 + j * 0.28);
      for (let i = Math.floor(cx - w / 2); i <= Math.ceil(cx + w / 2); i++) {
        bossPix(x, i, yy, j > 14 ? pal.kosodeSh : pal.kosode);
      }
    }
  }
  /* 胴 (小袖) 台形 */
  for (let j = 0; j < 16; j++) {
    const yy = 22 + j;
    const half = 6.5 + j * 0.16;
    for (let i = Math.floor(23 - half); i <= Math.ceil(23 + half); i++) {
      bossPix(x, i, yy, j > 10 ? pal.kosodeSh : pal.kosode);
    }
  }
  /* 襟 (V字・差し色) */
  bossPix(x, 21, 22, pal.acc); bossPix(x, 24, 22, pal.acc);
  bossPix(x, 20, 23, pal.acc); bossPix(x, 25, 23, pal.acc);
  bossPix(x, 21, 24, pal.acc); bossPix(x, 24, 24, pal.acc);
  bossPix(x, 22, 25, pal.accSh ? pal.accSh : pal.acc); bossPix(x, 23, 25, pal.acc);
  bossPix(x, 22, 26, '#fff'); bossPix(x, 23, 26, '#fff');
  /* 胴の正中線と袖内側の陰 */
  for (let j = 27; j <= 36; j++) bossPix(x, 22, j, pal.kosodeSh);
  for (let j = 0; j < 16; j++) {
    const yy = 28 + j;
    bossPix(x, Math.round(23 - 6.5 - j * 0.16), yy, pal.kosodeSh);
    bossPix(x, Math.round(23 + 6.5 + j * 0.16), yy, pal.kosodeSh);
  }
  /* 帯 */
  for (let yy = 37; yy <= 40; yy++)
    for (let i = 17; i <= 28; i++)
      bossPix(x, i, yy, (yy === 37 || yy === 40) ? '#a87f2a' : '#e8b84a');
  bossPix(x, 22, 38, pal.acc); bossPix(x, 23, 38, pal.acc); // 帯締め
  /* 袴 (プリーツ) */
  for (let j = 0; j < 20; j++) {
    const yy = 41 + j;
    const half = 7 + j * 0.5;
    for (let i = Math.floor(23 - half); i <= Math.ceil(23 + half); i++) {
      const pleat = ((i - (23 - half)) % 4) < 1.2;
      bossPix(x, i, yy, pleat ? pal.hakamaSh : pal.hakama);
    }
  }
}

/* ---- 頭部 (顔・前髪・顔を縁取る前髪束・月冠) 目開/目閉 ---- */
function drawHead(x, pal, blink) {
  /* 顔 */
  for (let j = 5; j <= 15; j++)
    for (let i = 18; i <= 28; i++)
      if (!(j < 6 && (i === 18 || i === 28)))
        bossPix(x, i, j, j > 13 ? pal.skinSh : pal.skin);
  /* 目 (開) : 2x2+ハイライト */
  if (!blink) {
    for (const ex of [20, 25]) {
      bossPix(x, ex, 11, pal.eye); bossPix(x, ex + 1, 11, pal.eye);
      bossPix(x, ex, 12, pal.eye); bossPix(x, ex + 1, 12, pal.eye === '#ff4a5a' ? '#8a1020' : '#6a5570');
      bossPix(x, ex, 11, '#ffffff');
    }
  } else {
    bossPix(x, 20, 11, '#7a5a6a'); bossPix(x, 21, 12, '#7a5a6a');
    bossPix(x, 25, 12, '#7a5a6a'); bossPix(x, 26, 11, '#7a5a6a');
  }
  /* 口・頬 */
  bossPix(x, 23, 14, '#d88a8a');
  bossPix(x, 19, 13, pal.skinSh); bossPix(x, 27, 13, pal.skinSh);
  /* 前髪 (額を残しつつM字) */
  for (let i = 17; i <= 29; i++) {
    for (let j = 2; j <= 9; j++) {
      const edge = j + Math.abs(i - 23) * 1.05;
      if (edge <= 8) bossPix(x, i, j, HAIR);
    }
  }
  /* 前髪の毛先ハイライト */
  for (let i = 19; i <= 27; i += 2) bossPix(x, i, 8, HAIR_HI);
  bossPix(x, 23, 7, HAIR_HI);
  /* 顔を縁取る前髪束 (左右・胸まで) */
  for (const side of [-1, 1]) {
    const bx0 = side < 0 ? 16 : 28;
    for (let j = 8; j <= 30; j++) {
      const sway = Math.sin(j * 0.4 + 1) * 0.8;
      const i0 = Math.round(bx0 + side * ((j > 20 ? (j - 20) * 0.06 : 0)) + sway * 0.4);
      bossPix(x, i0, j, HAIR); bossPix(x, i0 + 1, j, HAIR);
    }
    for (let j = 10; j <= 28; j += 2) {
      bossPix(x, bx0 + (side < 0 ? 0 : 2), j, HAIR_HI);
    }
  }
  /* 月冠カンザシ (三日月の髪飾り) */
  bossPix(x, 19, 2, '#ffe08a'); bossPix(x, 20, 2, pal.acc);
  bossPix(x, 18, 3, '#ffe08a'); bossPix(x, 20, 3, '#ffe08a');
  bossPix(x, 18, 4, '#ffe08a'); bossPix(x, 19, 4, pal.acc);
  bossPix(x, 21, 1, pal.acc);
  /* 垂れ飾り */
  bossPix(x, 17, 5, pal.acc); bossPix(x, 17, 6, '#fff'); bossPix(x, 17, 7, pal.acc);
}

/* ---- 御幣腕 (down / up) ---- */
function drawArmGohei(x, pal, up) {
  if (!up) { /* 右手に垂らす */
    /* 腕(袖先) */
    for (let j = 0; j < 10; j++) bossPix(x, 33, 28 + j, j > 6 ? pal.kosodeSh : pal.kosode);
    bossPix(x, 33, 28, pal.skin); bossPix(x, 34, 33, pal.skin);
    /* 御幣の柄 */
    for (let j = 0; j < 16; j++) bossPix(x, 35, 26 + j, '#8a6844');
    /* 紙垂(しで)ジグザグ */
    const shide = (cx, cy, w) => {
      bossPix(x, cx, cy, '#ffffff'); bossPix(x, cx + 1, cy, '#ffffff');
      bossPix(x, cx + 1, cy + 1, '#ffffff'); bossPix(x, cx + 2, cy + 1, '#d8d4e4');
      bossPix(x, cx + 2, cy + 2, '#ffffff'); bossPix(x, cx + 3, cy + 2, '#ffffff');
      bossPix(x, cx + 3, cy + 3, '#d8d4e4'); bossPix(x, cx + 2, cy + 3, '#ffffff');
      bossPix(x, cx + 2, cy + 4, '#ffffff'); bossPix(x, cx + 1, cy + 4, '#ffffff');
      bossPix(x, cx + 1, cy + 5, '#d8d4e4'); bossPix(x, cx, cy + 5, '#ffffff');
      bossPix(x, cx, cy + 6, '#ffffff'); bossPix(x, cx - 1, cy + 6, '#d8d4e4');
    };
    shide(33, 22, 4);
    shide(36, 18, 4);
  } else { /* 掲げる */
    for (let j = 0; j < 8; j++) bossPix(x, 32 - j * 0.4, 24 - j, pal.kosode);
    bossPix(x, 29, 16, pal.skin);
    for (let j = 0; j < 14; j++) bossPix(x, 30, 16 - j, '#8a6844');
    const shide = (cx, cy) => {
      bossPix(x, cx, cy, '#ffffff'); bossPix(x, cx + 1, cy, '#ffffff');
      bossPix(x, cx - 1, cy + 1, '#ffffff'); bossPix(x, cx + 2, cy + 1, '#d8d4e4');
      bossPix(x, cx - 1, cy + 2, '#ffffff'); bossPix(x, cx + 1, cy + 2, '#ffffff');
      bossPix(x, cx - 2, cy + 3, '#d8d4e4'); bossPix(x, cx + 2, cy + 3, '#ffffff');
      bossPix(x, cx - 2, cy + 4, '#ffffff'); bossPix(x, cx - 1, cy + 4, '#d8d4e4');
      bossPix(x, cx - 2, cy + 5, '#ffffff'); bossPix(x, cx - 1, cy + 5, '#ffffff');
    };
    shide(31, 4); shide(27, 6);
  }
}

/* ---- 光環ハロー (手続き・回転させる) ---- */
function drawHalo(pal, dark) {
  const R = 84, c = makeCanvas(R * 2, R * 2), x = ctx2(c);
  const col = dark ? '#8a6aff' : '#ffd75e';
  /* 主環 */
  x.fillStyle = dark ? 'rgba(138,106,255,0.55)' : 'rgba(255,215,94,0.5)';
  x.beginPath(); x.arc(R, R, 62, 0, TAU); x.arc(R, R, 58, 0, TAU, true); x.fill();
  x.fillStyle = dark ? 'rgba(200,180,255,0.8)' : 'rgba(255,240,190,0.85)';
  x.beginPath(); x.arc(R, R, 61, 0, TAU); x.arc(R, R, 59.6, 0, TAU, true); x.fill();
  /* 12の紙垂オーナメント */
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    x.save();
    x.translate(R + Math.cos(a) * 66, R + Math.sin(a) * 66);
    x.rotate(a + Math.PI / 2);
    x.fillStyle = i % 2 ? (dark ? '#cdbcff' : '#fff6d8') : col;
    x.fillRect(-1, 0, 2, 6);
    x.fillRect(1, 2, 3, 2);
    x.fillRect(-4, 4, 3, 2);
    x.restore();
  }
  /* 内環の桜紋(5弁連続) */
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    if (i % 2) continue;
    x.fillStyle = pal.acc;
    x.save();
    x.translate(R + Math.cos(a) * 50, R + Math.sin(a) * 50);
    x.rotate(a);
    x.fillRect(-2, -1, 4, 2);
    x.restore();
  }
  return c;
}

/* ---- 式神(紙人形) 2フレーム ---- */
function drawShikigami(f, pal) {
  const rows = f === 0 ? [
    '..ww..',
    '.wWWw.',
    '.wrrw.',
    'wWWWWw',
    'WWWwWW',
    '.WWwW.',
    '.rWWw.',
    'WWWWWW',
    'wWr.Ww',
    '.w..w.',
  ] : [
    '..ww..',
    '.wWWw.',
    '.wrrw.',
    'wWWWWw',
    'WWwWWW',
    '.WwWW.',
    '.wWWr.',
    'WWWWWW',
    'wW.rWw',
    '.w..w.',
  ];
  return pxmap({ w: '#f4efe0', W: '#d8d0b4', r: '#c13030' }, rows.map(r => r.padEnd(6, '.')));
}

/* ---- 狐面 ---- */
function drawFoxMask() {
  return pxmap({
    w: '#f4efe4', W: '#cfc4ac', r: '#c13030', k: '#2a1f2a',
  }, [
    '..w....w..',
    '.wWw..wWw.',
    '.wWwwwwWw.',
    '.wwwwwwww.',
    'wwwwwwwwww',
    'wkwwwwwwkw',
    'wrrwwwwrrw',
    '.wwwwwwww.',
    '..wrrrrw..',
    '...wwww...',
  ].map(r => r.padEnd(10, '.')));
}

/* ---- ビルド: 8フェーズ分 ---- */
function buildBossSprites() {
  S.boss = [];
  for (let p = 0; p < 8; p++) {
    const pal = BOSS_PAL[p];
    const dark = (p === 6);
    const mk = () => makeCanvas(BW, BH);
    const hair0 = mk(), hair1 = mk();
    drawHairBack(ctx2(hair0), 0);
    drawHairBack(ctx2(hair1), 1.4);
    const body = mk(); drawBody(ctx2(body), pal);
    const head = mk(); drawHead(ctx2(head), pal, false);
    const headBlink = mk(); drawHead(ctx2(headBlink), pal, true);
    const armDown = mk(), armUp = mk();
    drawArmGohei(ctx2(armDown), pal, false);
    drawArmGohei(ctx2(armUp), pal, true);
    S.boss.push({
      pal,
      parts: { hair: [hair0, hair1], body, head, headBlink, armDown, armUp },
      halo: drawHalo(pal, dark),
      dark,
    });
  }
  S.shiki = [drawShikigami(0), drawShikigami(1)];
  S.foxMask = drawFoxMask();
  /* 被弾/撃破用 白フラッシュ版(ボディのみ) */
  S.bossFlash = S.boss.map(b => {
    const c = makeCanvas(BW, BH), x = ctx2(c);
    x.drawImage(b.parts.body, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, BW, BH);
    return c;
  });
}
