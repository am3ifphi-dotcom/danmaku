/* ============================================================
 * 常夜桜 -TOKOYO-ZAKURA-  core.js
 * 基盤: グローバル状態 / キャンバス / 入力 / RNG / 数学 / ピクセル支援
 * ============================================================ */
'use strict';

const TAU = Math.PI * 2;

const G = window.G = {
  W: 480, H: 640,            // 内部解像度
  PF: { x0: 12, y0: 48, x1: 468, y1: 632 }, // プレイフィールド
  canvas: null, ctx: null,
  time: 0,                   // 起動からの秒数
  frame: 0,                  // 起動からのフレーム数(60fps基準)
  state: 'boot',             // boot|title|difficulty|howto|intro|play|pause|result|gameover
  paused: false,
  run: null,                 // 現在のラン情報(stages.js)
  diff: 'NORMAL',
  rng: null,
  qa: { on: false, seed: 12345, fast: false }, // ?qa=1&seed=N
  isTouch: false,
  save: null,
  spr: null,                 // sprites.js が構築
  icon: null,                // icons.js が構築
  fontReady: false,
};

/* ---------- 乱数 (mulberry32, シード固定で再現可能) ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedRand(seed) { G.rng = mulberry32(seed); }
function rnd(a = 1, b) { // [0,a) or [a,b)
  if (b === undefined) { b = a; a = 0; }
  return a + (G.rng ? G.rng() : Math.random()) * (b - a);
}
function rndi(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(rnd(arr.length)) % arr.length]; }

/* ---------- 数学 ---------- */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeIn = t => t * t;
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function angLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
  return a + d * t;
}
function dist2(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; }
function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return String(Math.floor(sec / 60)) + ':' + String(sec % 60).padStart(2, '0');
}

/* ---------- オフスクリーン canvas ---------- */
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}
function ctx2(c, smoothing = false) {
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = smoothing;
  return x;
}

/* ---------- ピクセルマップ → canvas ----------
 * rows: 文字列配列 (1文字=1px, '.'=透明)
 * pal : {char: '#rrggbb' or [r,g,b,a]}
 */
function pxmap(pal, rows, scale = 1) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(w * scale, h * scale);
  const x = ctx2(c);
  for (let j = 0; j < h; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      x.fillStyle = Array.isArray(col)
        ? `rgba(${col[0]},${col[1]},${col[2]},${(col[3] ?? 255) / 255})` : col;
      x.fillRect(i * scale, j * scale, scale, scale);
    }
  }
  return c;
}
/* 既存 canvas をスケール複製 (色変換なし) */
function scaleCanvas(src, s) {
  const c = makeCanvas(src.width * s, src.height * s);
  const x = ctx2(c);
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
/* 色相/明度シフトした複製 (ボスパレット用に簡易版: 色置換) */
function remapCanvas(src, map) { // map: {'#src':'#dst'}
  const c = makeCanvas(src.width, src.height);
  const x = ctx2(c);
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data, lut = {};
  for (const k in map) {
    const s = parseInt(k.slice(1), 16), t = parseInt(map[k].slice(1), 16);
    lut[k.slice(1).toLowerCase()] = t;
  }
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const key = ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1);
    const t = lut[key];
    if (t !== undefined) { d[i] = (t >> 16) & 255; d[i + 1] = (t >> 8) & 255; d[i + 2] = t & 255; }
  }
  x.putImageData(img, 0, 0);
  return c;
}

/* ---------- テキスト ---------- */
function drawText(x, txt, px, py, opt = {}) {
  const size = opt.size || 16;
  x.font = `${size}px DotGothic16, "Hiragino Kaku Gothic ProN", monospace`;
  x.textAlign = opt.align || 'left';
  x.textBaseline = opt.baseline || 'top';
  if (opt.shadow !== false) {
    x.fillStyle = opt.shadowColor || 'rgba(0,0,10,.85)';
    const o = Math.max(1, Math.round(size / 16));
    x.fillText(txt, px + (opt.sdx ?? o), py + (opt.sdy ?? o));
  }
  if (opt.glow) {
    x.save();
    x.shadowColor = opt.glow; x.shadowBlur = size * 0.5;
    x.fillStyle = opt.color || '#fff';
    x.fillText(txt, px, py);
    x.restore();
  } else {
    x.fillStyle = opt.color || '#fff';
    x.fillText(txt, px, py);
  }
}

/* ---------- セーブ ---------- */
const SAVE_KEY = 'tokoyozakura_v1';
function loadSave() {
  try {
    G.save = JSON.parse(localStorage.getItem(SAVE_KEY)) || null;
  } catch (e) { G.save = null; }
  if (!G.save) G.save = { best: { EASY: 0, NORMAL: 0, HARD: 0 }, cleared: { EASY: false, NORMAL: false, HARD: false }, missBest: { EASY: 99, NORMAL: 99, HARD: 99 } };
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) { /* 無視 */ }
}

/* ---------- 入力 ---------- */
const Input = {
  down: {}, edge: {},
  touchActive: false, tx: 0, ty: 0, tdx: 0, tdy: 0,
  touchSlow: false,
  _lastTX: 0, _lastTY: 0,

  init(canvas) {
    const keymap = e => {
      const k = e.key;
      if (k === ' ') return 'z'; // スペース=決定
      return k.length === 1 ? k.toLowerCase() : k;
    };
    window.addEventListener('keydown', e => {
      const k = keymap(e);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift'].includes(e.key) ||
          ['z', 'x', 'p'].includes(k)) e.preventDefault();
      if (!this.down[k]) this.edge[k] = true;
      this.down[k] = true;
      G.audio?.unlock();
      G.isTouch = false;
    });
    window.addEventListener('keyup', e => { this.down[keymap(e)] = false; });
    window.addEventListener('blur', () => { this.down = {}; if (G.state === 'play') G.pauseGame?.(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') G.pauseGame?.(); });

    /* タッチ: ドラッグ=相対移動 */
    const cPos = e => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return [(t.clientX - r.left) * (canvas.width / r.width),
              (t.clientY - r.top) * (canvas.height / r.height)];
    };
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      G.audio?.unlock();
      G.isTouch = true;
      const [x, y] = cPos(e);
      if (G.touchUI && G.touchUI.some(b => b.hit(x, y))) return; // UIボタン優先
      if (!this.touchActive) { this.touchActive = true; this._lastTX = x; this._lastTY = y; this.tx = x; this.ty = y; this.tdx = 0; this.tdy = 0; this.edge.tap = true; }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!this.touchActive) return;
      const [x, y] = cPos(e);
      this.tdx += x - this._lastTX; this.tdy += y - this._lastTY;
      this._lastTX = x; this._lastTY = y; this.tx = x; this.ty = y;
    }, { passive: false });
    const end = e => { e.preventDefault(); this.touchActive = false; this.tdx = 0; this.tdy = 0; };
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
    /* PCのクリック=決定 */
    canvas.addEventListener('mousedown', e => { G.audio?.unlock(); this.edge.tap = true; });
  },

  /* 軸: -1..1 */
  axis() {
    let x = 0, y = 0;
    const d = this.down;
    if (d['ArrowLeft'] || d['a']) x -= 1;
    if (d['ArrowRight'] || d['d']) x += 1;
    if (d['ArrowUp'] || d['w']) y -= 1;
    if (d['ArrowDown'] || d['s']) y += 1;
    if (x && y) { const s = Math.SQRT1_2; x *= s; y *= s; }
    return { x, y };
  },
  get focus() { return !!(this.down['Shift'] || this.touchSlow); },
  pressed(k) { return !!this.edge[k]; },
  consumeEdges() { this.edge = {}; },
};

/* ---------- 画面フィット ---------- */
function fitCanvas() {
  const cw = window.innerWidth, ch = window.innerHeight;
  const s = Math.min(cw / G.W, ch / G.H);
  const css = G.canvas.style;
  css.width = Math.floor(G.W * s) + 'px';
  css.height = Math.floor(G.H * s) + 'px';
}

/* ---------- 画面効果(シェイク等) ---------- */
const FX = {
  shakeT: 0, shakeMag: 0, flashT: 0, flashColor: '#fff',
  flashAlpha: 0, slowmoT: 0, vignetteDark: 0, // 0..1
  shake(mag, t) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, t); },
  flash(color, alpha, t) { this.flashColor = color; this.flashAlpha = alpha; this.flashT = t; },
  update(dt) {
    if (this.shakeT > 0) this.shakeT -= dt; else this.shakeMag = 0;
    if (this.flashT > 0) this.flashT -= dt;
  },
  applyTransform(x) {
    if (this.shakeT > 0) {
      const m = this.shakeMag * Math.min(1, this.shakeT * 4);
      x.translate(Math.round((Math.random() - .5) * 2 * m), Math.round((Math.random() - .5) * 2 * m));
    }
  },
  drawOverlay(x) {
    if (this.flashT > 0) {
      x.save();
      x.globalAlpha = Math.min(1, this.flashT * 3) * this.flashAlpha;
      x.fillStyle = this.flashColor;
      x.fillRect(0, 0, G.W, G.H);
      x.restore();
    }
  },
};

function vibrate(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }
