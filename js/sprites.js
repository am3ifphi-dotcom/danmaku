/* ============================================================
 * 常夜桜 sprites.js
 * 戦闘スプライト工房: 弾 / 自機(折鶴) / エフェクト / レーザー
 * すべてコード上でドット絵として生成(外部画像不使用・100%自作)
 * ============================================================ */
'use strict';

const S = G.spr = {};
G.spr = S;

/* ---------- 弾の色設計 (背景=暗い藍に対し高明度でコントラスト確保) ---------- */
/* hi=閃核, mid=主色, lo=縁, glow=外光 */
const BCOL = S.BCOL = {
  white:  { hi: '#ffffff', mid: '#fff3cf', lo: '#d8b26a', glow: 'rgba(255,236,170,0.42)' },
  gold:   { hi: '#fff6c8', mid: '#ffd75e', lo: '#c07a1e', glow: 'rgba(255,200,80,0.40)' },
  pink:   { hi: '#ffe3f2', mid: '#ff8fc4', lo: '#c13f7d', glow: 'rgba(255,130,190,0.40)' },
  cyan:   { hi: '#eaffff', mid: '#6ee8ff', lo: '#1f7fc1', glow: 'rgba(110,230,255,0.40)' },
  violet: { hi: '#f4e8ff', mid: '#b98cff', lo: '#6a3fb0', glow: 'rgba(185,140,255,0.42)' },
  red:    { hi: '#ffd8d0', mid: '#ff6a5a', lo: '#a32633', glow: 'rgba(255,90,80,0.42)' },
  jade:   { hi: '#eafff4', mid: '#7dffb8', lo: '#1f9466', glow: 'rgba(125,255,184,0.38)' },
  amber:  { hi: '#fff0d0', mid: '#ffb35c', lo: '#a85a1f', glow: 'rgba(255,179,92,0.40)' },
};
S.bcolKeys = Object.keys(BCOL);

/* 回転スプライト事前生成 (16方向) */
const ROTS = 16;
function makeRots(draw, size) { // draw(x,size): base facing +X を描く
  const base = makeCanvas(size, size);
  draw(ctx2(base), size);
  const arr = [];
  for (let i = 0; i < ROTS; i++) {
    const a = (i / ROTS) * TAU;
    const c = makeCanvas(size, size);
    const x = ctx2(c);
    x.translate(size / 2, size / 2);
    x.rotate(a);
    x.drawImage(base, -size / 2, -size / 2);
    arr.push(c);
  }
  return arr;
}

/* ---------- 弾スプライト生成 ---------- */
function buildBullets() {
  S.bul = {};
  for (const key in BCOL) {
    const bc = BCOL[key];
    S.bul[key] = {
      orb: mkOrb(bc, 5.2),
      bead: mkOrb(bc, 3.4),
      shard: mkShard(bc),
      star: mkStar(bc),
      ring: mkRing(bc),
      foxfire: mkFoxfire(bc),
      petal: makeRots((x, s) => drawPetal(x, bc, s), 22),
      kunai: makeRots((x, s) => drawKunai(x, bc, s), 20),
      wisp: makeRots((x, s) => drawWisp(x, bc, s), 24),
      ofuda: makeRots((x, s) => drawOfuda(x, bc, s), 22),
    };
  }
  /* 視覚サイズと当たり判定半径 */
  S.bulHitR = { orb: 3.2, bead: 2.4, shard: 2.6, star: 2.8, ring: 4.0, foxfire: 3.4, petal: 3.0, kunai: 2.6, wisp: 3.2, ofuda: 3.4 };
}

function mkOrb(bc, r) {
  const R = Math.ceil(r * 2.6);
  const c = makeCanvas(R * 2, R * 2);
  const x = ctx2(c);
  const cx = R, cy = R;
  let g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, bc.glow); g.addColorStop(0.6, bc.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, R * 2, R * 2);
  x.fillStyle = bc.lo;
  circle(x, cx, cy, r + 1.6); x.fill();
  x.fillStyle = bc.mid;
  circle(x, cx, cy, r); x.fill();
  x.fillStyle = bc.hi;
  circle(x, cx - r * 0.18, cy - r * 0.18, r * 0.62); x.fill();
  x.fillStyle = '#ffffff';
  x.fillRect(Math.round(cx - r * 0.42), Math.round(cy - r * 0.46), Math.max(1, r * 0.3 | 0), Math.max(1, r * 0.26 | 0));
  return c;
}
function mkShard(bc) {
  const R = 12, c = makeCanvas(R * 2, R * 2), x = ctx2(c);
  let g = x.createRadialGradient(R, R, 0, R, R, R);
  g.addColorStop(0, bc.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, R * 2, R * 2);
  const dia = (dx, dy, w, h, col) => {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(R + dx, R + dy - h); x.lineTo(R + dx + w, R + dy);
    x.lineTo(R + dx, R + dy + h); x.lineTo(R + dx - w, R + dy);
    x.closePath(); x.fill();
  };
  dia(0, 0, 6, 9, bc.lo);
  dia(0, 0, 4, 7, bc.mid);
  dia(-0.5, -1, 2.2, 4.2, bc.hi);
  x.fillStyle = '#fff'; x.fillRect(R - 1, R - 4, 2, 2);
  return c;
}
function mkStar(bc) {
  const R = 11, c = makeCanvas(R * 2, R * 2), x = ctx2(c);
  let g = x.createRadialGradient(R, R, 0, R, R, R);
  g.addColorStop(0, bc.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, R * 2, R * 2);
  const plus = (len, w, col) => {
    x.fillStyle = col;
    x.fillRect(R - w / 2, R - len, w, len * 2);
    x.fillRect(R - len, R - w / 2, len * 2, w);
  };
  plus(9, 3, bc.lo);
  plus(7, 2, bc.mid);
  plus(4.6, 1, bc.hi);
  x.fillStyle = '#fff'; x.fillRect(R - 1, R - 1, 2, 2);
  return c;
}
function mkRing(bc) {
  const R = 13, c = makeCanvas(R * 2, R * 2), x = ctx2(c);
  let g = x.createRadialGradient(R, R, 0, R, R, R);
  g.addColorStop(0, bc.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, R * 2, R * 2);
  x.fillStyle = bc.lo; circle(x, R, R, 9.4); x.fill();
  x.fillStyle = bc.mid; circle(x, R, R, 7.8); x.fill();
  x.fillStyle = 'rgba(8,8,20,0.96)'; circle(x, R, R, 5.4); x.fill();
  x.fillStyle = bc.hi;
  x.beginPath();
  x.arc(R, R, 6.9, -TAU * 0.22, -TAU * 0.03);
  x.arc(R, R, 5.6, -TAU * 0.03, -TAU * 0.22, true);
  x.closePath(); x.fill();
  return c;
}
function mkFoxfire(bc) { // 狐火: 放射対称・渦巻きの青白い炎
  const R = 13, c = makeCanvas(R * 2, R * 2), x = ctx2(c);
  let g = x.createRadialGradient(R, R, 0, R, R, R);
  g.addColorStop(0, 'rgba(160,240,255,0.5)'); g.addColorStop(0.75, bc.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, R * 2, R * 2);
  for (let k = 0; k < 5; k++) { // 炎の舌(回転対称)
    const a0 = (k / 5) * TAU;
    x.fillStyle = k % 2 ? bc.lo : bc.mid;
    x.beginPath();
    x.arc(R, R, 6.4, a0, a0 + 0.55);
    x.arc(R + Math.cos(a0 + 0.9) * 3.4, R + Math.sin(a0 + 0.9) * 3.4, 3.4, a0 + 0.55, a0, true);
    x.closePath(); x.fill();
  }
  x.fillStyle = '#ffffff'; circle(x, R, R, 2.6); x.fill();
  return c;
}
function drawPetal(x, bc, s) { // 桜花弁 (+X向き) s=22
  const cx = s / 2, cy = s / 2;
  x.fillStyle = bc.glow;
  circle(x, cx, cy, s * 0.46); x.fill();
  const petal = (dx, dy, rx, ry, col) => {
    x.fillStyle = col;
    x.beginPath(); x.ellipse(cx + dx, cy + dy, rx, ry, 0, 0, TAU); x.fill();
  };
  petal(0, 0, 7.6, 4.6, bc.lo);
  petal(0.4, 0, 6.4, 3.7, bc.mid);
  petal(1, 0, 4.6, 2.6, bc.hi);
  x.fillStyle = bc.lo; // 切れ込み
  x.fillRect(cx + 5, cy - 1, 3, 1);
  x.fillRect(cx + 5, cy + 1, 3, 1);
  x.fillStyle = '#ffffff';
  x.fillRect(cx - 3, cy - 2, 2, 1);
}
function drawKunai(x, bc, s) { // 苦無・矢弾 (+X向き) s=20
  const cx = s / 2, cy = s / 2;
  let g = x.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5);
  g.addColorStop(0, bc.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  x.fillStyle = bc.lo;
  x.beginPath();
  x.moveTo(cx + 9, cy); x.lineTo(cx - 5, cy - 3.6); x.lineTo(cx - 2.4, cy); x.lineTo(cx - 5, cy + 3.6);
  x.closePath(); x.fill();
  x.fillStyle = bc.mid;
  x.beginPath();
  x.moveTo(cx + 7.4, cy); x.lineTo(cx - 3.4, cy - 2.4); x.lineTo(cx - 1.2, cy); x.lineTo(cx - 3.4, cy + 2.4);
  x.closePath(); x.fill();
  x.fillStyle = bc.hi;
  x.beginPath();
  x.moveTo(cx + 5.6, cy); x.lineTo(cx - 1, cy - 1.1); x.lineTo(cx - 1, cy + 1.1);
  x.closePath(); x.fill();
}
function drawWisp(x, bc, s) { // 尾を引く鬼火 (+X向き) s=24
  const cx = s / 2, cy = s / 2;
  let g = x.createRadialGradient(cx, cy, 0, cx, cy, s * 0.52);
  g.addColorStop(0, bc.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  x.fillStyle = bc.lo; // 尾
  x.beginPath();
  x.moveTo(cx - 10, cy); x.quadraticCurveTo(cx - 5, cy - 4.4, cx + 1, cy - 3);
  x.lineTo(cx + 1, cy + 3); x.quadraticCurveTo(cx - 5, cy + 4.4, cx - 10, cy);
  x.closePath(); x.fill();
  x.fillStyle = bc.mid; circle(x, cx + 2, cy, 4.6); x.fill();
  x.fillStyle = bc.hi; circle(x, cx + 2.6, cy, 3); x.fill();
  x.fillStyle = '#fff'; circle(x, cx + 3.2, cy, 1.4); x.fill();
}
function drawOfuda(x, bc, s) { // お札弾 (+X向き・壁用) s=22
  const cx = s / 2 - 1, cy = s / 2;
  let g = x.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5);
  g.addColorStop(0, bc.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  x.fillStyle = '#efe6c8'; // 和紙
  x.fillRect(cx - 7, cy - 4, 14, 8);
  x.fillStyle = '#c9bd96';
  x.fillRect(cx - 7, cy + 2, 14, 2);
  x.fillStyle = bc.lo;
  x.fillRect(cx - 7, cy - 4, 14, 1); // 縁
  x.fillRect(cx - 7, cy + 3, 14, 1);
  x.fillStyle = '#c13030'; // 朱の印
  x.fillRect(cx - 5, cy - 2, 3, 4);
  x.fillRect(cx - 1, cy - 2, 5, 1);
  x.fillRect(cx - 1, cy + 1, 4, 1);
}
function circle(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); }

/* ---------- 自機「折鶴」 ---------- */
function buildPlayer() {
  // フレームA(羽ばたき上) / B(下) 20x18
  const palC = { W: '#f4fbff', w: '#bcd8f0', B: '#5f96e8', b: '#2a4f9e', G: '#8fefff', o: '#e8f4ff' };
  const craneA = pxmap(palC, [
    '....................',
    '.........oo.........',
    '........oWWo........',
    '.......oWWWwo.......',
    '......oWWWwwo.......',
    '.....oWWWwwwwo......',
    '..BBoWWWwwwwwo......',
    '.BbbBWWWwwwwwo......',
    '.BbbbbWWwwwWo.......',
    '..BbbbWWWwWo........',
    '...BbbWWWWGo........',
    '....BbWWWbG.........',
    '.....BWWb...........',
    '....oWWWb...........',
    '...oWWwo............',
    '...oWwo.............',
    '.....................'.slice(0, 20),
    '....................',
  ].slice(0, 18));
  const craneB = pxmap(palC, [
    '....................',
    '.............BB.....',
    '............BbbB....',
    '...........Bbbbbb...',
    '..........Bbbbbbbb..',
    '.........oWbbWWBb...',
    '........oWWWwWWBb...',
    '.......oWWWwwwoBb...',
    '......oWWWwwwwo.....',
    '.....oWWWwwwWo......',
    '....oWWWwwwWo.......',
    '...oWWWWwwGo........',
    '....BbWWWwG.........',
    '.....BWWb...........',
    '....oWWWb...........',
    '...oWWwo............',
    '...oWwo.............',
    '....................',
  ]);
  S.crane = [craneA, craneB];
  /* 輝きオーラ */
  const R = 26, cg = makeCanvas(R * 2, R * 2), xg = ctx2(cg);
  let g = xg.createRadialGradient(R, R, 0, R, R, R);
  g.addColorStop(0, 'rgba(140,235,255,0.5)');
  g.addColorStop(0.5, 'rgba(120,200,255,0.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  xg.fillStyle = g; xg.fillRect(0, 0, R * 2, R * 2);
  S.craneGlow = cg;
  /* 当たり判定マーカー (低速時) */
  const R2 = 9, ch = makeCanvas(R2 * 2, R2 * 2), xh = ctx2(ch);
  xh.fillStyle = 'rgba(140,240,255,0.25)'; circle(xh, R2, R2, 8); xh.fill();
  xh.fillStyle = '#ffffff'; circle(xh, R2, R2, 3); xh.fill();
  xh.fillStyle = '#6ee8ff'; circle(xh, R2, R2, 2); xh.fill();
  S.hitDot = ch;
  /* 無敵シールドリング */
  const R3 = 22, cs = makeCanvas(R3 * 2, R3 * 2), xs = ctx2(cs);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    xs.fillStyle = i % 2 ? 'rgba(140,235,255,0.9)' : 'rgba(255,255,255,0.9)';
    xs.save();
    xs.translate(R3 + Math.cos(a) * 16, R3 + Math.sin(a) * 16);
    xs.rotate(a + Math.PI / 2);
    xs.fillRect(-2, -1, 4, 2);
    xs.restore();
  }
  S.shield = cs;
}

/* ---------- FX スプライト ---------- */
function buildFx() {
  S.glow = {};
  for (const key in BCOL) {
    const R = 40, c = makeCanvas(R * 2, R * 2), x = ctx2(c);
    let g = x.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, BCOL[key].mid.replace(')', '') ? tintAlpha(BCOL[key], 0.65) : BCOL[key].glow);
    g.addColorStop(0.55, BCOL[key].glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, R * 2, R * 2);
    S.glow[key] = c;
  }
  /* 火花プラス印 */
  S.spark = {};
  for (const key in BCOL) {
    const R = 8, c = makeCanvas(R * 2, R * 2), x = ctx2(c);
    x.fillStyle = BCOL[key].glow; x.fillRect(R - 5, R - 1, 10, 2); x.fillRect(R - 1, R - 5, 2, 10);
    x.fillStyle = BCOL[key].hi; x.fillRect(R - 3, R - 1, 6, 2); x.fillRect(R - 1, R - 3, 2, 6);
    x.fillStyle = '#fff'; x.fillRect(R - 1, R - 1, 2, 2);
    S.spark[key] = c;
  }
  /* 弾消滅→花弁変換用ミニ花弁 3種 × 8方向 */
  S.miniPetal = [];
  for (let v = 0; v < 3; v++) {
    const base = makeCanvas(10, 10), xb = ctx2(base);
    xb.fillStyle = ['#ffb7d5', '#ff9ec6', '#ffd0e4'][v];
    xb.fillRect(3, 2, 4, 6 - v);
    xb.fillStyle = '#ff8fb8';
    xb.fillRect(3, 4 + (v === 2 ? 1 : 0), 4, 2);
    const rots = [];
    for (let i = 0; i < 8; i++) {
      const c = makeCanvas(10, 10), x = ctx2(c);
      x.translate(5, 5); x.rotate((i / 8) * TAU); x.drawImage(base, -5, -5);
      rots.push(c);
    }
    S.miniPetal.push(rots);
  }
}
function tintAlpha(bc, a) {
  // bc.mid '#rrggbb' → rgba
  const n = parseInt(bc.mid.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---------- レーザー ---------- */
function buildLasers() {
  S.laser = {};
  for (const key in BCOL) {
    const bc = BCOL[key];
    const W = 44, H = 32;
    const mid = makeCanvas(W, H), x = ctx2(mid);
    let g = x.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.22, bc.glow);
    g.addColorStop(0.38, bc.lo);
    g.addColorStop(0.46, bc.mid);
    g.addColorStop(0.5, '#ffffff');
    g.addColorStop(0.54, bc.mid);
    g.addColorStop(0.62, bc.lo);
    g.addColorStop(0.78, bc.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const cap = makeCanvas(W, W), xc = ctx2(cap);
    let rg = xc.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(0.25, bc.mid);
    rg.addColorStop(0.6, bc.glow);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    xc.fillStyle = rg;
    xc.fillRect(0, 0, W, W);
    S.laser[key] = { mid, cap, w: W };
  }
  /* 起動点のチャージ光 */
  const R = 18, c = makeCanvas(R * 2, R * 2), x = ctx2(c);
  let g2 = x.createRadialGradient(R, R, 0, R, R, R);
  g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.35, 'rgba(255,255,255,0.75)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g2; x.fillRect(0, 0, R * 2, R * 2);
  S.laserCharge = c;
}

/* ---------- 一括ビルド ---------- */
function buildSprites() {
  buildBullets();
  buildPlayer();
  buildFx();
  buildLasers();
  if (typeof buildBackground === 'function') buildBackground();
  if (typeof buildBossSprites === 'function') buildBossSprites();
}
