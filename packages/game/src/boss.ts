import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from '@gds/engine';

/** Procedural pixel-art boss + parallax background, drawn on canvas. */

const PALETTES = [
  ['#7aa2ff', '#3b4a8f', '#cfe0ff'],
  ['#ff7ad9', '#8f3b6e', '#ffd1f2'],
  ['#7dffcb', '#2f7f66', '#d8fff2'],
  ['#ffb35c', '#8f5a2b', '#ffe3bd'],
  ['#ff5c5c', '#8f2b2b', '#ffd1d1'],
];

export function makeBackground(stage: number, phase: number) {
  const stars = Array.from({ length: 90 }, (_, i) => ({
    x: (i * 53 + stage * 31) % PLAYFIELD_WIDTH,
    y: (i * 97 + phase * 17) % PLAYFIELD_HEIGHT,
    s: (i % 3) + 1,
    v: 8 + (i % 5) * 7,
  }));
  const hues = [222, 190, 265, 150, 285];
  return (ctx: CanvasRenderingContext2D, time: number) => {
    const hue = hues[stage % hues.length] + phase * 6;
    const g = ctx.createLinearGradient(0, 0, 0, PLAYFIELD_HEIGHT);
    g.addColorStop(0, `hsl(${hue},55%,${7 + phase}%)`);
    g.addColorStop(0.6, `hsl(${hue + 20},60%,13%)`);
    g.addColorStop(1, `hsl(${hue + 40},55%,6%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
    // stars (2 layers)
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const st of stars) {
      const y = (st.y + time * st.v) % PLAYFIELD_HEIGHT;
      ctx.globalAlpha = 0.35 + (st.s / 3) * 0.6;
      ctx.fillRect(st.x, y, st.s, st.s);
    }
    ctx.globalAlpha = 1;
    // distant silhouettes
    ctx.fillStyle = `hsla(${hue},50%,22%,0.55)`;
    for (let i = 0; i < 7; i++) {
      const bx = ((i * 71 - time * 6) % (PLAYFIELD_WIDTH + 60) + PLAYFIELD_WIDTH + 60) % (PLAYFIELD_WIDTH + 60) - 30;
      const bh = 40 + ((i * 37) % 50);
      ctx.fillRect(bx, PLAYFIELD_HEIGHT - bh, 26, bh);
      ctx.fillRect(bx + 8, PLAYFIELD_HEIGHT - bh - 12, 10, 12);
    }
    // ground glow line
    ctx.fillStyle = `hsla(${hue + 60},90%,65%,0.35)`;
    ctx.fillRect(0, PLAYFIELD_HEIGHT - 3, PLAYFIELD_WIDTH, 2);
  };
}

/** Animated boss at emitter origin (center-top). Phase changes palette/form. */
export function makeBoss(phase: number) {
  const [main, dark, light] = PALETTES[phase % PALETTES.length];
  return (ctx: CanvasRenderingContext2D, time: number) => {
    const cx = PLAYFIELD_WIDTH / 2 + Math.sin(time * 0.7) * 18;
    const cy = 112 + Math.sin(time * 1.7) * 7;
    const bob = Math.sin(time * 3) * 2;
    ctx.save(); ctx.translate(cx, cy + bob);
    // aura
    const pulse = 30 + Math.sin(time * 4) * 5 + phase * 3;
    const rg = ctx.createRadialGradient(0, 0, 4, 0, 0, pulse + 26);
    rg.addColorStop(0, main + '55'); rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, pulse + 26, 0, Math.PI * 2); ctx.fill();
    // orbiting shards
    for (let i = 0; i < 4 + phase; i++) {
      const a = time * (0.9 + phase * 0.15) + (i * Math.PI * 2) / (4 + phase);
      const ox = Math.cos(a) * (34 + phase * 2), oy = Math.sin(a) * 16;
      ctx.fillStyle = i % 2 ? light : main;
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(a); ctx.fillRect(-4, -2, 8, 4); ctx.restore();
    }
    // wings (flap)
    const flap = Math.sin(time * 5) * 4;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-34, -14 - flap); ctx.lineTo(-28, 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(34, -14 - flap); ctx.lineTo(28, 8); ctx.closePath(); ctx.fill();
    // body pixel silhouette
    ctx.fillStyle = main;
    ctx.fillRect(-10, -16, 20, 26);
    ctx.fillRect(-13, -6, 26, 10);
    ctx.fillStyle = dark; ctx.fillRect(-10, 6, 20, 6);
    // crown / horns (more in later phases)
    ctx.fillStyle = light;
    ctx.fillRect(-12, -22, 5, 8); ctx.fillRect(7, -22, 5, 8);
    if (phase >= 2) { ctx.fillRect(-3, -26, 6, 10); }
    if (phase >= 4) { ctx.fillRect(-16, -18, 4, 6); ctx.fillRect(12, -18, 4, 6); }
    // core eye
    const blink = Math.sin(time * 1.3) > -0.92;
    ctx.fillStyle = '#fff'; ctx.fillRect(-5, -10, 10, blink ? 7 : 2);
    ctx.fillStyle = '#111'; ctx.fillRect(-2, -8, 4, 4);
    ctx.fillStyle = light; ctx.fillRect(-7, 2, 14, 3);
    ctx.restore();
  };
}
