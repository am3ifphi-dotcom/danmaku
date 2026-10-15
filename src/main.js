// Entry point: loads fonts and sprites, sets up audio/input, runs a fixed 60 Hz update with
// a requestAnimationFrame render loop.
import { W, H, FPS, DIFFICULTY } from './config.js';
import { Sprites } from './assets.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';

async function boot() {
  const canvas = document.getElementById('screen');
  canvas.width = W;
  canvas.height = H;
  const loading = document.getElementById('loading');

  try { await document.fonts.load('32px DotGothic16'); } catch (e) { /* fall back to monospace */ }
  const sprites = await new Sprites().load('assets/sprites/manifest.json');

  const audio = new Audio();
  const input = new Input(canvas);
  const game = new Game({ canvas, sprites, audio, input });
  window.__danmaku = game; // handy for debugging in the browser console
  window.__DIFF = DIFFICULTY; // used by the automated survival test

  // Browsers only allow audio after a user gesture: start the title track on the first input.
  let audioStarted = false;
  const unlock = async () => {
    await audio.resume();
    if (!audioStarted) { audioStarted = true; audio.setTrack('title'); }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  document.getElementById('fs').addEventListener('click', () => game.toggleFullscreen());

  // fixed-timestep simulation at 60 Hz; the render runs every animation frame
  const step = 1000 / FPS;
  let acc = 0;
  let last = performance.now();
  const frame = now => {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= step) {
      game.update();
      acc -= step;
    }
    game.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  loading.remove();
}

boot().catch(err => {
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = 'Load error: ' + err.message;
  console.error(err);
});
