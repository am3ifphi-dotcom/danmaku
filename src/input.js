// Keyboard + pointer input. Edge-triggered keys are collected in `pressed` and cleared once per tick.
import { W, H } from './config.js';

export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.pressed = new Set();
    this.pointer = null;     // {x,y} in logical px while a pointer is held
    this.tap = null;         // {x,y} for a single tap / click this tick
    this.canvas = canvas;

    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', e => this.down.delete(e.code));
    window.addEventListener('blur', () => { this.down.clear(); this.pointer = null; });

    const toLogical = e => {
      const r = canvas.getBoundingClientRect();
      // object-fit: contain letterboxing — compute the drawn rect
      const s = Math.min(r.width / W, r.height / H);
      const ox = r.left + (r.width - W * s) / 2, oy = r.top + (r.height - H * s) / 2;
      return { x: (e.clientX - ox) / s, y: (e.clientY - oy) / s };
    };
    canvas.addEventListener('pointerdown', e => {
      const p = toLogical(e);
      this.pointer = p;
      this.tap = p;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => { if (this.pointer) this.pointer = toLogical(e); });
    const up = () => { this.pointer = null; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  has(code) { return this.down.has(code); }
  isPressed(...codes) { return codes.some(c => this.pressed.has(c)); }

  get dir() {
    let dx = 0, dy = 0;
    if (this.has('ArrowLeft') || this.has('KeyA')) dx -= 1;
    if (this.has('ArrowRight') || this.has('KeyD')) dx += 1;
    if (this.has('ArrowUp') || this.has('KeyW')) dy -= 1;
    if (this.has('ArrowDown') || this.has('KeyS')) dy += 1;
    return { dx, dy };
  }

  get focus() { return this.has('ShiftLeft') || this.has('ShiftRight') || this.has('KeyZ'); }

  endTick() { this.pressed.clear(); this.tap = null; }
}
