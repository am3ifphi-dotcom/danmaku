/* ============================================================
 * icons.js - UIアイコン
 * 出典: Pixel Art Icons (https://github.com/halfmage/pixelarticons)
 * 作者: halfmage  ライセンス: MIT License
 * (24x24グリッドのSVGパスをインライン化して使用)
 * ============================================================ */
'use strict';

const ICON_SRC = {
  heart:  'M13 22h-2v-2h2v2Zm-2-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-6-2H7v-2h2v2Zm8 0h-2v-2h2v2ZM7 16H5v-2h2v2Zm12 0h-2v-2h2v2ZM5 14H3v-2h2v2Zm16 0h-2v-2h2v2ZM3 12H1V6h2v6Zm20 0h-2V6h2v6ZM13 8h-2V6h2v2ZM5 6H3V4h2v2Zm6 0H9V4h2v2Zm4 0h-2V4h2v2Zm6 0h-2V4h2v2ZM9 4H5V2h4v2Zm10 0h-4V2h4v2Z',
  moon:   'M18 22H8v-2h10v2ZM8 20H6v-2h2v2Zm12 0h-2v-2h2v2ZM6 18H4v-2h2v2Zm16 0h-2v-4h-2v-2h2v-2h2v8ZM4 16H2V6h2v10Zm14 0h-6v-2h6v2Zm-6-2h-2v-2h2v2Zm-2-2H8V6h2v6ZM6 6H4V4h2v2Zm8-2h-2v2h-2V4H6V2h8v2Z',
  star:   'M5 20H8V22H3V16H5V20ZM21 22H16V20H19V16H21V22ZM10 20H8V18H10V20ZM16 20H14V18H16V20ZM14 18H10V16H14V18ZM7 16H5V13H7V16ZM19 16H17V13H19V16ZM5 13H3V11H5V13ZM21 13H19V11H21V13ZM9 9H3V11H1V7H9V9ZM23 11H21V9H15V7H23V11ZM11 7H9V3H11V7ZM15 7H13V3H15V7ZM13 3H11V1H13V3Z',
  play:   'M15 11h-2V9h2zm0 4h-2v-2h2zm-2 2h-2v-2h2zm0-8h-2V7h2zM9 21H7V3h2zm6-8h2v-2h-2zm-6 4h2v2H9z',
  pause:  'M10 20H4V4h6v16Zm8-16v16h-6V4h6Zm-4 2v12h2V6h-2ZM6 18h2V6H6v12Z',
  vol3:   'M11 22H9v-2H7v-2h2V6H7V4h2V2h2v20Zm8 0h-6v-2h6v2Zm2-2h-2v-2h2v2ZM7 18H5v-2h2v2Zm10 0h-4v-2h4v2Zm6 0h-2V6h2v12ZM5 10H3v4h2v2H1V8h4v2Zm14 6h-2V8h2v8Zm-4-2h-2v-4h2v4ZM7 8H5V6h2v2Zm10 0h-4V6h4v2Zm4-2h-2V4h2v2Zm-2-2h-6V2h6v2Z',
  volx:   'M13 22h-2v-2H9v-2h2V6H9V4h2V2h2v20Zm-4-4H7v-2h2v2Zm-2-8H5v4h2v2H3V8h4v2Zm10.001 5.224h-2v-2H17v-2h-1.999v-2h2v2H19v2h-1.999v2Zm3.999 0h-2v-2h2v2Zm0-4h-2v-2h2v2ZM9 8H7V6h2v2Z',
  flag:   'M4 2h2v20H4zM4 4h16v2H4zm12 2h2v2h-2zm-2 2h2v2h-2zm2 2h2v2h-2zM4 12h16v2H4z',
  trophy: 'M16 17H13V19H15V21H9V19H11V17H8V15H16V17ZM18 5H22V11H20V7H18V11H20V13H18V15H16V5H8V15H6V13H4V11H6V7H4V11H2V5H6V3H18V5Z',
};

function buildIcons() {
  G.icon = {};
  for (const name in ICON_SRC) {
    try {
      if (typeof Path2D === 'undefined') { G.icon[name] = makeCanvas(24, 24); continue; }
      const path = new Path2D(ICON_SRC[name]);
      G.icon[name] = (color, size = 24, pad = 2) => {
        const key = name + color + size;
        buildIcons._cache[key] = buildIcons._cache[key] || (() => {
          const c = makeCanvas(size + pad * 2, size + pad * 2);
          const x = ctx2(c);
          x.scale((size) / 24, (size) / 24);
          x.translate(pad * 24 / size, pad * 24 / size);
          x.fillStyle = color;
          x.fill(path);
          return c;
        })();
        return buildIcons._cache[key];
      };
    } catch (e) { G.icon[name] = () => makeCanvas(24, 24); }
  }
}
buildIcons._cache = {};
