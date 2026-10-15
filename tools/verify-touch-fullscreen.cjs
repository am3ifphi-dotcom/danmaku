// Verify: touch drag moves the player, F key requests fullscreen, result and gameover screens render.
const chromiumMod = require('@sparticuz/chromium');
const chromium = chromiumMod.default || chromiumMod;
const puppeteer = require('puppeteer-core');
const OUT = '/home/user/.scratch/shots';

(async () => {
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath: exe, args: [...chromium.args, '--autoplay-policy=no-user-gesture-required'],
    headless: true, defaultViewport: { width: 1280, height: 720, hasTouch: true, isMobile: true },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  await page.goto('http://127.0.0.1:8000/index.html', { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1200));

  // ---- touch: start stage 1 via the game API, then drag with touch events ----
  await page.evaluate(() => { const g = window.__danmaku; g.startStage(0); g.screen = 'stage'; });
  await new Promise(r => setTimeout(r, 2500));
  const canvasBox = await page.$eval('canvas', c => { const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const toScreen = (lx, ly) => ({ x: canvasBox.x + lx * canvasBox.w / 640, y: canvasBox.y + ly * canvasBox.h / 360 });
  const p0 = await page.evaluate(() => { const p = window.__danmaku.run.player; return { x: p.x, y: p.y }; });
  const a = toScreen(p0.x, p0.y), b = toScreen(120, 300);
  await page.touchscreen.touchStart(a.x, a.y);
  for (let i = 1; i <= 20; i++) {
    await page.touchscreen.touchMove(a.x + (b.x - a.x) * i / 20, a.y + (b.y - a.y) * i / 20);
    await new Promise(r => setTimeout(r, 30));
  }
  await new Promise(r => setTimeout(r, 300));
  await page.touchscreen.touchEnd();
  const p1 = await page.evaluate(() => { const p = window.__danmaku.run.player; return { x: p.x, y: p.y }; });
  const touchOk = Math.hypot(p1.x - p0.x, p1.y - p0.y) > 40;
  console.log('TOUCH', JSON.stringify({ from: p0, to: p1, moved: touchOk }));

  // ---- fullscreen: press F (headless may refuse; we record what happens) ----
  await page.keyboard.press('KeyF');
  await new Promise(r => setTimeout(r, 500));
  const fs = await page.evaluate(() => !!document.fullscreenElement);
  console.log('FULLSCREEN_F_KEY', JSON.stringify({ fullscreenElement: fs }));

  // ---- result screen: force a clear ----
  await page.evaluate(() => { const g = window.__danmaku; g.screen = 'result'; });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: OUT + '/05-result.png' });

  // ---- gameover screen ----
  await page.evaluate(() => { const g = window.__danmaku; g.screen = 'gameover'; });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: OUT + '/06-gameover.png' });

  // ---- boss in different states: capture stage 2 boss windup ----
  await page.evaluate(() => { const g = window.__danmaku; g.screen = 'select'; g.run = null; g.startStage(1); g.screen = 'stage'; });
  await new Promise(r => setTimeout(r, 6500));
  await page.screenshot({ path: OUT + '/07-stage2.png' });
  const st = await page.evaluate(() => { const r = window.__danmaku.run; return { state: r.state, phase: r.phaseIdx, boss: r.boss.state, bullets: r.B.list.length }; });
  console.log('STAGE2', JSON.stringify(st));

  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
