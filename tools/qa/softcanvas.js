/* ============================================================
 * softcanvas.js - Node用ソフトウェア Canvas2D (QAレンダリング専用)
 * ゲームが使うCanvas APIのサブセットをソフトウェアラスタライズ
 * ============================================================ */
'use strict';
const zlib = require('zlib');

/* ---------- 色 ---------- */
function parseColor(s) {
  if (Array.isArray(s)) return s;
  if (typeof s !== 'string') return [255, 0, 255, 255];
  s = s.trim();
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map(v => parseFloat(v));
    return [p[0], p[1], p[2], p[3] === undefined ? 255 : Math.round(p[3] * 255)];
  }
  return [255, 0, 255, 255];
}

/* ---------- グラデーション ---------- */
class Grad {
  constructor(type, x0, y0, r0, x1, y1, r1) {
    this.type = type; this.x0 = x0; this.y0 = y0; this.r0 = r0;
    this.x1 = x1; this.y1 = y1; this.r1 = r1; this.stops = [];
  }
  addColorStop(u, c) { this.stops.push([u, parseColor(c)]); this.stops.sort((a, b) => a[0] - b[0]); }
  colorAt(u) {
    const st = this.stops;
    if (!st.length) return [0, 0, 0, 0];
    if (u <= st[0][0]) return st[0][1];
    if (u >= st[st.length - 1][0]) return st[st.length - 1][1];
    for (let i = 0; i < st.length - 1; i++) {
      const [u0, c0] = st[i], [u1, c1] = st[i + 1];
      if (u >= u0 && u <= u1) {
        const t = u1 === u0 ? 0 : (u - u0) / (u1 - u0);
        return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t,
        c0[2] + (c1[2] - c0[2]) * t, c0[3] + (c1[3] - c0[3]) * t];
      }
    }
    return st[0][1];
  }
  at(ux, uy) {
    if (this.type === 'linear') {
      const dx = this.x1 - this.x0, dy = this.y1 - this.y0;
      const len2 = dx * dx + dy * dy || 1;
      const u = ((ux - this.x0) * dx + (uy - this.y0) * dy) / len2;
      return this.colorAt(u);
    }
    const d = Math.hypot(ux - this.x0, uy - this.y0);
    const R = (this.r1 ?? 0) || 1;
    return this.colorAt(d / R);
  }
}

/* ---------- Context2D ---------- */
class Ctx {
  constructor(canvas) {
    this.canvas = canvas;
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.imageSmoothingEnabled = false;
    this.shadowBlur = 0; this.shadowColor = '#000';
    this.font = '16px monospace';
    this.textAlign = 'left'; this.textBaseline = 'alphabetic';
    this._path = null; this._sub = null;
  }
  /* transform */
  save() { this.stack.push({ m: this.m.slice(), ga: this.globalAlpha, gc: this.globalCompositeOperation, fs: this.fillStyle, ss: this.strokeStyle, lw: this.lineWidth }); }
  restore() { const s = this.stack.pop(); if (s) { this.m = s.m; this.globalAlpha = s.ga; this.globalCompositeOperation = s.gc; this.fillStyle = s.fs; this.strokeStyle = s.ss; this.lineWidth = s.lw; } }
  translate(x, y) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); }
  rotate(a) { const c = Math.cos(a), s = Math.sin(a); this.m = mul(this.m, [c, s, -s, c, 0, 0]); }
  scale(x, y) { this.m = mul(this.m, [x, 0, 0, y === undefined ? x : y, 0, 0]); }
  transform(a, b, c, d, e, f) { this.m = mul(this.m, [a, b, c, d, e, f]); }
  setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
  resetTransform() { this.m = [1, 0, 0, 1, 0, 0]; }

  /* -------- 合成 -------- */
  _put(px, py, col) {
    const W = this.canvas.width, H = this.canvas.height;
    if (px < 0 || py < 0 || px >= W || py >= H) return;
    const d = this.canvas._data, i = (py * W + px) * 4;
    let sa = (col[3] / 255) * this.globalAlpha;
    if (sa <= 0) return;
    if (this.globalCompositeOperation === 'lighter') {
      d[i] = Math.min(255, d[i] + col[0] * sa);
      d[i + 1] = Math.min(255, d[i + 1] + col[1] * sa);
      d[i + 2] = Math.min(255, d[i + 2] + col[2] * sa);
      d[i + 3] = Math.min(255, d[i + 3] + col[3] * sa);
    } else {
      const da = d[i + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; return; }
      d[i] = (col[0] * sa + d[i] * da * (1 - sa)) / outA;
      d[i + 1] = (col[1] * sa + d[i + 1] * da * (1 - sa)) / outA;
      d[i + 2] = (col[2] * sa + d[i + 2] * da * (1 - sa)) / outA;
      d[i + 3] = outA * 255;
    }
  }
  _styleColor(style, ux, uy, recursive) {
    if (style instanceof Grad) {
      // デバイス座標→ユーザ座標へ逆変換して評価(呼び出し側で実施)
      return style.at(ux, uy);
    }
    return parseColor(style);
  }

  /* -------- 矩形 -------- */
  clearRect(x, y, w, h) {
    const p = [[0, 0], [w, 0], [w, h], [0, h]].map(([a, b]) => this._pt(x + a, y + b));
    this._fillPoly(p, null, true);
  }
  fillRect(x, y, w, h) {
    const p = [[0, 0], [w, 0], [w, h], [0, h]].map(([a, b]) => this._pt(x + a, y + b));
    this._fillPoly(p, this.fillStyle);
  }
  strokeRect(x, y, w, h) {
    this.fillRect(x, y, w, this.lineWidth);
    this.fillRect(x, y + h - this.lineWidth, w, this.lineWidth);
    this.fillRect(x, y, this.lineWidth, h);
    this.fillRect(x + w - this.lineWidth, y, this.lineWidth, h);
  }

  /* -------- ポリゴン塗り -------- */
  _fillPoly(pts, style, clear = false) {
    if (pts.length < 3) return;
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const [px, py] of pts) {
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
    const W = this.canvas.width, H = this.canvas.height;
    minX = Math.max(0, Math.floor(minX)); minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(W - 1, Math.ceil(maxX)); maxY = Math.min(H - 1, Math.ceil(maxY));
    const inv = invert(this.m);
    for (let yy = minY; yy <= maxY; yy++) {
      for (let xx = minX; xx <= maxX; xx++) {
        if (!pointInPoly(xx + 0.5, yy + 0.5, pts)) continue;
        if (clear) {
          const d = this.canvas._data, i = (yy * W + xx) * 4;
          d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
        } else {
          let col;
          if (style instanceof Grad) {
            const u = applyPt(inv, [xx + 0.5, yy + 0.5]);
            col = style.at(u[0], u[1]);
          } else col = parseColor(style);
          this._put(xx, yy, col);
        }
      }
    }
  }

  /* -------- パス -------- */
  beginPath() { this._path = []; this._sub = null; }
  moveTo(x, y) { this._sub = [this._pt(x, y)]; this._path.push(this._sub); }
  lineTo(x, y) { if (!this._sub) this.moveTo(x, y); else this._sub.push(this._pt(x, y)); }
  closePath() { if (this._sub && this._sub.length) this._sub.push(this._sub[0]); }
  rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
  arc(cx, cy, r, a0, a1, ccw) {
    const segs = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / 3.2));
    for (let i = 0; i <= segs; i++) {
      const t = ccw ? a0 + (a1 - a0) * (i / segs) : a0 + (a1 - a0) * (i / segs);
      const p = this._pt(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
      if (!this._sub) this.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
      else this._sub.push(p);
    }
  }
  ellipse(cx, cy, rx, ry, rot, a0, a1, ccw) {
    const segs = Math.max(12, 36);
    for (let i = 0; i <= segs; i++) {
      const t = a0 + (a1 - a0) * (i / segs);
      const ex = Math.cos(t) * rx, ey = Math.sin(t) * ry;
      const px = cx + ex * Math.cos(rot) - ey * Math.sin(rot);
      const py = cy + ex * Math.sin(rot) + ey * Math.cos(rot);
      if (!this._sub) this.moveTo(px, py); else this._sub.push(this._pt(px, py));
    }
  }
  quadraticCurveTo(cx, cy, x, y) {
    if (!this._sub) return this.moveTo(x, y);
    const p0 = this._sub[this._sub.length - 1];
    const m = this.m;
    const qc = applyPt(invert(m), p0), qc1 = [cx, cy], qc2 = [x, y];
    for (let i = 1; i <= 8; i++) {
      const t = i / 8, u = 1 - t;
      this.lineTo(u * u * qc[0] + 2 * u * t * qc1[0] + t * t * qc2[0], u * u * qc[1] + 2 * u * t * qc1[1] + t * t * qc2[1]);
    }
  }
  fill() {
    if (!this._path) return;
    const all = this._path.filter(s => s.length >= 3);
    if (!all.length) return;
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const s of all) for (const [px, py] of s) {
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
    const W = this.canvas.width, H = this.canvas.height;
    minX = Math.max(0, Math.floor(minX)); minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(W - 1, Math.ceil(maxX)); maxY = Math.min(H - 1, Math.ceil(maxY));
    const inv = invert(this.m), style = this.fillStyle;
    const edges = [];
    for (const s of all) {
      for (let i = 0; i < s.length - 1; i++) edges.push([s[i], s[i + 1]]);
    }
    for (let yy = minY; yy <= maxY; yy++) {
      // even-odd スキャンライン
      const xs = [];
      const y = yy + 0.5;
      for (const [[ax, ay], [bx, by]] of edges) {
        if ((ay > y) === (by > y)) continue;
        xs.push(ax + (y - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.max(minX, Math.floor(xs[k])), x1 = Math.min(maxX, Math.ceil(xs[k + 1]));
        for (let xx = x0; xx <= x1; xx++) {
          let col;
          if (style instanceof Grad) {
            const u = applyPt(inv, [xx + 0.5, y]);
            col = style.at(u[0], u[1]);
          } else col = parseColor(style);
          this._put(xx, yy, col);
        }
      }
    }
  }
  stroke() {
    if (!this._path) return;
    const col = parseColor(this.strokeStyle);
    const r = Math.max(0.5, this.lineWidth / 2);
    for (const s of this._path) {
      for (let i = 0; i < s.length - 1; i++) {
        const [ax, ay] = s[i], [bx, by] = s[i + 1];
        const len = Math.hypot(bx - ax, by - ay);
        const steps = Math.max(1, Math.ceil(len / 1.5));
        for (let k = 0; k <= steps; k++) {
          const px = Math.round(ax + (bx - ax) * k / steps), py = Math.round(ay + (by - ay) * k / steps);
          for (let oy = -Math.ceil(r); oy <= Math.ceil(r); oy++)
            for (let ox = -Math.ceil(r); ox <= Math.ceil(r); ox++)
              if (ox * ox + oy * oy <= r * r) this._put(px + ox, py + oy, col);
        }
      }
    }
  }

  /* -------- 画像貼付 -------- */
  drawImage(img, dx, dy, dw, dh) {
    const sw = img.width, sh = img.height;
    if (dw === undefined) { dw = sw; dh = sh; }
    // 変換後の平行四辺形
    const c0 = this._pt(dx, dy), c1 = this._pt(dx + dw, dy), c2 = this._pt(dx, dy + dh);
    let minX = Math.min(c0[0], c1[0], c2[0], c1[0] + c2[0] - c0[0]);
    let maxX = Math.max(c0[0], c1[0], c2[0], c1[0] + c2[0] - c0[0]);
    let minY = Math.min(c0[1], c1[1], c2[1], c1[1] + c2[1] - c0[1]);
    let maxY = Math.max(c0[1], c1[1], c2[1], c1[1] + c2[1] - c0[1]);
    const W = this.canvas.width, H = this.canvas.height;
    minX = Math.max(0, Math.floor(minX)); minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(W - 1, Math.ceil(maxX)); maxY = Math.min(H - 1, Math.ceil(maxY));
    if (maxX < minX || maxY < minY) return;
    // 逆アフィン (u,v)→(x,y): x = c0 + u*e1 + v*e2
    const e1 = [c1[0] - c0[0], c1[1] - c0[1]], e2 = [c2[0] - c0[0], c2[1] - c0[1]];
    const det = e1[0] * e2[1] - e1[1] * e2[0];
    if (Math.abs(det) < 1e-9) return;
    const src = img._data;
    for (let yy = minY; yy <= maxY; yy++) {
      for (let xx = minX; xx <= maxX; xx++) {
        const fx = xx + 0.5 - c0[0], fy = yy + 0.5 - c0[1];
        let u = (fx * e2[1] - fy * e2[0]) / det;
        let v = (fy * e1[0] - fx * e1[1]) / det;
        if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
        let sx = (u * sw) | 0, sy = (v * sh) | 0;
        const si = (sy * sw + sx) * 4;
        const a = src[si + 3];
        if (!a) continue;
        // 色抜き(source のサイズが dw と異なる場合のスケーリングも u で吸収)
        this._put(xx, yy, [src[si], src[si + 1], src[si + 2], a]);
      }
    }
  }

  createLinearGradient(x0, y0, x1, y1) { return new Grad('linear', x0, y0, 0, x1, y1, 0); }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new Grad('radial', x0, y0, r0, x1, y1, r1); }

  /* -------- テキスト (QAでは外形のみ) -------- */
  fillText(t, x, y) { /* フォント描画はQA対象外 */ }
  measureText(t) { const size = parseInt(this.font) || 16; return { width: String(t).length * size * 0.5 }; }

  getImageData(x, y, w, h) {
    const out = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
    const d = this.canvas._data, W = this.canvas.width;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const si = ((y + j) * W + (x + i)) * 4, di = (j * w + i) * 4;
      out.data[di] = d[si]; out.data[di + 1] = d[si + 1];
      out.data[di + 2] = d[si + 2]; out.data[di + 3] = d[si + 3];
    }
    return out;
  }
  putImageData(img, x, y) {
    const d = this.canvas._data, W = this.canvas.width;
    for (let j = 0; j < img.height; j++) for (let i = 0; i < img.width; i++) {
      const di = ((y + j) * W + (x + i)) * 4, si = (j * img.width + i) * 4;
      d[di] = img.data[si]; d[di + 1] = img.data[si + 1];
      d[di + 2] = img.data[si + 2]; d[di + 3] = img.data[si + 3];
    }
  }

  _pt(x, y) { return applyPt(this.m, [x, y]); }
}

/* 行列ユーティリティ [a,b,c,d,e,f] */
function mul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
function invert(m) {
  const det = m[0] * m[3] - m[1] * m[2] || 1e-9;
  return [
    m[3] / det, -m[1] / det, -m[2] / det, m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}
function applyPt(m, [x, y]) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

class SoftCanvas {
  constructor(w, h) {
    this._w = w; this._h = h;
    this._data = new Uint8ClampedArray(Math.max(1, w * h * 4));
    this.style = {};
  }
  get width() { return this._w; }
  set width(v) { this._w = v; this._data = new Uint8ClampedArray(Math.max(1, v * this._h * 4)); this._ctx = null; }
  get height() { return this._h; }
  set height(v) { this._h = v; this._data = new Uint8ClampedArray(Math.max(1, this._w * v * 4)); this._ctx = null; }
  getContext(kind) { return this._ctx || (this._ctx = new Ctx(this)); }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.width, height: this.height }; }
  addEventListener() { }
  toDataURL() { return 'data:,'; }
}

module.exports = { SoftCanvas, parseColor };
