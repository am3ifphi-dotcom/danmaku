// Reach the real stage-clear path (invincible player, fast-forward) and screenshot the result screen.
const chromiumMod = require('@sparticuz/chromium');
const chromium = chromiumMod.default || chromiumMod;
const puppeteer = require('puppeteer-core');
(async () => {
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({ executablePath: exe, args: chromium.args, headless: true, defaultViewport: { width: 1280, height: 720 } });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/index.html', { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1000));
  const info = await page.evaluate(() => {
    const g = window.__danmaku;
    g.diff = window.__DIFF.normal;
    g.startStage(0); g.screen = 'stage';
    let f = 0;
    while (g.screen === 'stage' && f < 60 * 400) {
      if (g.run) { g.run.player.lives = 99; g.run.player.invuln = 999; }
      g.update(); f++;
    }
    const r = g.result;
    return { screen: g.screen, frames: f, result: r ? { score: r.score, graze: r.graze, nomiss: r.nomiss, coins: r.coins, allClear: r.allClear } : null };
  });
  console.log('RESULT', JSON.stringify(info));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: '/home/user/.scratch/shots/05-result-real.png' });
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
