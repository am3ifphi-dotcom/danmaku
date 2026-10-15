// Loads the Pixel Frog / PixelRubro sprite manifest and generates procedural helpers
// (bullet orbs, safe-zone textures, background bands).
// Every sprite here is either an external CC0 frame (see CREDITS.md) or a self-drawn pixel sprite.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('image load failed: ' + src));
    im.src = src;
  });
}

export class Sprites {
  constructor() {
    this.map = {};
    this.procedural = {};
  }

  async load(manifestUrl) {
    const man = await (await fetch(manifestUrl)).json();
    const entries = Object.entries(man);
    await Promise.all(entries.map(async ([key, paths]) => {
      this.map[key] = await Promise.all(paths.map(loadImage));
    }));
    this.buildProcedural();
    return this;
  }

  // frames for a single key, or the concatenation of several keys (e.g. idle_1 + idle_2)
  frames(key) {
    if (Array.isArray(key)) return key.flatMap(k => this.map[k] || []);
    return this.map[key] || [];
  }

  buildProcedural() {
    this.procedural.orb = {};
    const palette = {
      teal: ['#e9fffb', '#56e6d0', '#127b74'],
      pink: ['#fff0fa', '#ff74c8', '#8a1f6b'],
      gold: ['#fffbe0', '#ffd23f', '#9a5a0a'],
      red: ['#fff2ea', '#ff5a4a', '#7d1417'],
      violet: ['#f6f0ff', '#b48cff', '#4b2a9c'],
      blue: ['#f0fbff', '#6ec8ff', '#1d4f9c'],
      white: ['#ffffff', '#dfe8ff', '#6f7fa8'],
    };
    for (const [name, [core, mid, edge]] of Object.entries(palette)) {
      this.procedural.orb[name] = this.makeOrb(core, mid, edge);
    }
    this.procedural.diamond = {};
    for (const [name, [core, mid, edge]] of Object.entries(palette)) {
      this.procedural.diamond[name] = this.makeDiamond(core, mid, edge);
    }
  }

  // 9x9 pixel orb: hand-stepped circle with a 3-tone shade (no anti-aliasing, dot-art look)
  makeOrb(core, mid, edge) {
    const c = document.createElement('canvas');
    c.width = c.height = 9;
    const g = c.getContext('2d');
    const rows = [
      '...eee...',
      '..eemme..',
      '.eemmmme.',
      'eemmccme.',
      'emmccccme',
      'emmccccme',
      '.emmmmme.',
      '..emmme..',
      '...eee...',
    ];
    const colors = { c: core, m: mid, e: edge };
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') { g.fillStyle = colors[ch]; g.fillRect(x, y, 1, 1); }
    }));
    return c;
  }

  makeDiamond(core, mid, edge) {
    const c = document.createElement('canvas');
    c.width = c.height = 9;
    const g = c.getContext('2d');
    const rows = [
      '....e....',
      '...eme...',
      '..emcme..',
      '.emccccme',
      'emcccccce'.slice(0, 9),
      '.emccccme',
      '..emcme..',
      '...eme...',
      '....e....',
    ];
    const colors = { c: core, m: mid, e: edge };
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') { g.fillStyle = colors[ch]; g.fillRect(x, y, 1, 1); }
    }));
    return c;
  }
}

// Draws a stepped (dithered) vertical gradient into an offscreen canvas.
export function makeBands(w, h, topHex, bottomHex, bands = 14) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const a = hexToRgb(topHex), b = hexToRgb(bottomHex);
  const bandH = h / bands;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const col = [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * t));
    g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    g.fillRect(0, Math.floor(i * bandH), w, Math.ceil(bandH) + 1);
    // dithered seam to the next band
    if (i < bands - 1) {
      const t2 = (i + 0.5) / (bands - 1);
      const col2 = [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * t2));
      g.fillStyle = `rgb(${col2[0]},${col2[1]},${col2[2]})`;
      const y0 = Math.floor((i + 1) * bandH) - 2;
      for (let y = y0; y < y0 + 4; y++) for (let x = (y % 2); x < w; x += 2) g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
