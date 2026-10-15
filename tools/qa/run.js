/* ============================================================
 * run.js - QAドライバ
 * Node上でゲームを「実際に動かし」、絵と数値を検証する
 * 使い方:
 *   node run.js sprites        … スプライトシート
 *   node run.js scenes         … 背景/タイトル/ボス8形態
 *   node run.js phase [N]      … フェーズの静止画&密度ヒートマップ
 *   node run.js sim            … 全フェーズ走行・衝突/上限/例外を検証
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { SoftCanvas } = require('./softcanvas');
const { encodePNG } = require('./png');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

/* ---------- DOM モック ---------- */
const gameCanvas = new SoftCanvas(480, 640);
const listeners = {};
global.window = global;
global.addEventListener = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
global.document = {
  createElement: (t) => t === 'canvas' ? new SoftCanvas(1, 1) : { style: {}, classList: { add() { } }, appendChild() { }, textContent: '' },
  getElementById: (id) => id === 'game' ? gameCanvas : { style: {}, classList: { add() { } }, textContent: '' },
  fonts: { add() { } },
  body: { classList: { add() { } } },
  addEventListener() { },
  hidden: false,
};
Object.defineProperty(global, 'navigator', { value: {}, configurable: true, writable: true });
global.localStorage = { getItem: () => null, setItem() { } };
Object.defineProperty(global, 'location', { value: { search: '?qa=1&seed=7' }, configurable: true, writable: true });
global.performance = require('perf_hooks').performance;
global.requestAnimationFrame = () => { };
global.FontFace = class { constructor() { } load() { return Promise.resolve(this); } };
global.Path2D = class { constructor() { } };

/* ---------- スクリプト読み込み(実ブラウザと同一順) ---------- */
const SRC = ['js/icons.js', 'js/core.js', 'js/sprites.js', 'js/spr_bg.js', 'js/spr_boss.js',
  'js/player.js', 'js/bullets.js', 'js/particles.js', 'js/audio.js', 'js/boss.js',
  'js/patterns.js', 'js/stages.js', 'js/ui.js', 'js/main.js'];
for (const f of SRC) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  vm.runInThisContext(code, { filename: f });
}
/* DOMContentLoaded発火→boot */
(async () => {
  try {
    for (const fn of (listeners['DOMContentLoaded'] || [])) fn();
    await new Promise(r => setTimeout(r, 50));

    const gvm = (code) => vm.runInThisContext(code);
    const G = global.G;
    if (!G.spr || !G.spr.crane) throw new Error('スプライト未構築');
    console.log('boot OK. font:', G.fontReady, 'state:', G.state);

    const mode = process.argv[2] || 'sprites';
    const arg = process.argv[3];

    const savePng = (cv, name) => {
      fs.writeFileSync(path.join(OUT, name), encodePNG(cv));
      console.log('  ->', name);
    };
    const shot = (name) => { gvm('render()'); savePng(gameCanvas, name); };

    /* ================= sprites ================= */
    if (mode === 'sprites') {
      const cv = new SoftCanvas(560, 760), x = cv.getContext('2d');
      const gctx = cv.getContext('2d');
      gctx.fillStyle = '#0a0d1f'; gctx.fillRect(0, 0, 560, 760);
      let col = 0, row = 0;
      const put = (img, sc = 2) => {
        cv.getContext('2d').drawImage(img, 10 + col * 62, 10 + row * 62, img.width * sc, img.height * sc);
        if (++col >= 9) { col = 0; row++; }
      };
      const S = G.spr;
      /* 弾: 全タイプ×全色 */
      for (const ckey of S.bcolKeys) {
        for (const t of ['orb', 'bead', 'shard', 'star', 'ring', 'foxfire']) put(S.bul[ckey][t]);
      }
      col = 0; row++;
      for (const ckey of S.bcolKeys) {
        for (const t of ['petal', 'kunai', 'wisp', 'ofuda']) put(S.bul[ckey][t][0]);
      }
      row++; col = 0;
      put(S.crane[0], 2.6); put(S.crane[1], 2.6); put(S.craneGlow, 1.2); put(S.hitDot, 2); put(S.shield, 1.4);
      put(S.laser.gold.mid, 1.2); put(S.laser.gold.cap, 1); put(S.laserCharge, 1.5);
      put(S.shiki[0], 3); put(S.shiki[1], 3); put(S.foxMask, 3);
      for (const k of S.bcolKeys) put(S.glow[k], 1);
      for (let v = 0; v < 3; v++) put(S.miniPetal[v][0], 3);
      savePng(cv, 'sprites.png');
      /* ボス8形態ストリップ */
      const bx = new SoftCanvas(8 * 110, 190), bxc = bx.getContext('2d');
      bxc.fillStyle = '#0a0d1f'; bxc.fillRect(0, 0, 8 * 110, 190);
      const Boss = vm.runInThisContext('Boss');
      for (let p = 0; p < 8; p++) {
        Boss.phase = p;
        const parts = S.boss[p].parts;
        bxc.drawImage(parts.hair[0], p * 110 + 9, 20, 92, 124);
        bxc.drawImage(parts.body, p * 110 + 9, 20, 92, 124);
        bxc.drawImage(parts.head, p * 110 + 9, 20, 92, 124);
        bxc.drawImage(parts.armUp, p * 110 + 9, 20, 92, 124);
        bxc.drawImage(S.boss[p].halo, p * 110 - 29, 0, 168, 168);
      }
      savePng(bx, 'boss_forms.png');
    }

    /* ================= scenes ================= */
    if (mode === 'scenes') {
      G.state = 'title';
      shot('title.png');
      G.state = 'difficulty'; vm.runInThisContext('UI.enter("difficulty")');
      shot('difficulty.png');
      vm.runInThisContext('G.state="howto"');
      shot('howto.png');
      /* 背景のみ */
      const bgCv = new SoftCanvas(480, 640), bx = bgCv.getContext('2d');
      const drawBackground = vm.runInThisContext('drawBackground');
      drawBackground(bx, 10, {});
      savePng(bgCv, 'background.png');
      /* ボス戦闘中タイトル無し: 第7形態の実機合成 */
      G.state = 'play';
      vm.runInThisContext('Stages.startRun("NORMAL"); G.run.seq="fight"; Stages.enterPhase(6); for(let i=0;i<100;i++){Boss.update();}');
      shot('night_pose.png');
    }

    /* ================= phase ================= */
    if (mode === 'phase' || mode === 'sim') {
      const diff = arg === 'EASY' || arg === 'HARD' ? arg : 'NORMAL';
      const from = mode === 'sim' ? 0 : (parseInt(process.argv[4] || '0'));
      const to = mode === 'sim' ? 7 : from;
      for (let pi = from; pi <= to; pi++) {
        vm.runInThisContext(`Stages.startRun("${diff}")`);
        G.run.seq = 'fight'; G.run.seqT = 100;
        vm.runInThisContext(`Stages.enterPhase(${pi})`);
        /* 転生演出を消化 */
        vm.runInThisContext('for(let i=0;i<95;i++) simStep()');
        const heat = new SoftCanvas(480, 640), hx = heat.getContext('2d');
        hx.fillStyle = '#000'; hx.fillRect(0, 0, 480, 640);
        const durF = G.run.durFs[pi];
        const capTimes = [0.25, 0.5, 0.75];
        let maxB = 0, minFreeTop = 1e9;
        const t0 = Date.now();
        for (let f = 0; f < durF - 5; f++) {
          vm.runInThisContext('simStep()');
          vm.runInThisContext('Player.invuln=1e9; if(!Player.alive){Player.alive=true;Player.respawnT=0;}'); // 不動プレイヤーで全フェーズ観察
          const BList = vm.runInThisContext('Bullets').list;
          maxB = Math.max(maxB, BList.length);
          if (f % 5 === 0) {
            for (const b of BList) {
              const o = ((b.y | 0) * 480 + (b.x | 0)) * 4;
              if (b.x >= 0 && b.x < 480 && b.y >= 0 && b.y < 640) {
                heat._data[o] = Math.min(255, heat._data[o] + 60);
                heat._data[o + 1] = Math.min(255, heat._data[o + 1] + 40);
                heat._data[o + 2] = Math.min(255, heat._data[o + 2] + 26);
                heat._data[o + 3] = 255;
              }
            }
          }
          const pr = f / durF;
          for (const ct of capTimes) {
            if (Math.abs(pr - ct) < 1 / durF) shot(`p${pi + 1}_t${Math.round(ct * 100)}.png`);
          }
          if (G.state !== 'play' || G.run.seq === 'down') break;
        }
        savePng(heat, `p${pi + 1}_heat.png`);
        console.log(`phase${pi + 1}: maxBullets=${maxB} hits=${G.run.hits} lives=${G.run.lives} simTime=${Date.now() - t0}ms state=${G.state}/${G.run.seq}`);
      }
    }

    /* ================= boss: クローズアップ ================= */
    if (mode === 'boss') {
      const ps = process.argv.slice(3).map(Number);
      const list = ps.length ? ps : [0, 6];
      const cv = new SoftCanvas(400 * list.length, 480), x = cv.getContext('2d');
      x.fillStyle = '#0a0d1f'; x.fillRect(0, 0, cv.width, 480);
      const Boss = vm.runInThisContext('Boss');
      list.forEach((p, k) => {
        const S = G.spr, bs = S.boss[p];
        const px = 200 + k * 400, py = 230, sc = 5;
        const w2 = 46 * sc / 2, h2 = 62 * sc / 2;
        x.drawImage(bs.halo, px - 168, py - 168, 336, 336); // ハロー(2倍)
        x.drawImage(bs.parts.hair[0], px - w2, py - h2, 46 * sc, 62 * sc);
        x.drawImage(bs.parts.body, px - w2, py - h2, 46 * sc, 62 * sc);
        x.drawImage(bs.parts.head, px - w2, py - h2, 46 * sc, 62 * sc);
        x.drawImage(bs.parts.armDown, px - w2, py - h2, 46 * sc, 62 * sc);
        x.drawImage(bs.parts.armUp, px + w2 + 30, py - h2, 46 * sc, 62 * sc); // 右にup姿
        x.drawImage(S.shiki[0], px - 150, py + 120, 36, 60);
        x.drawImage(S.foxMask, px + 114, py + 120, 56, 56);
      });
      savePng(cv, 'boss_close.png');
    }

    /* ================= run: 完全クリア統合テスト ================= */
    if (mode === 'run') {
      const diff = process.argv[3] || 'NORMAL';
      vm.runInThisContext(`Stages.startRun("${diff === 'GODOWN' ? 'NORMAL' : diff}")`);
      const log = [];
      let lastPhase = -1, lastSeq = '';
      let frames = 0;
      const maxFrames = 60 * 60 * 10; // 10分上限
      while (frames < maxFrames) {
        vm.runInThisContext('simStep()');
        if (diff !== 'GODOWN') vm.runInThisContext('Player.invuln=1e9; if(!Player.alive){Player.alive=true;Player.respawnT=0;}');
        frames++;
        if (!G.run) break;
        if (G.run.phaseIdx !== lastPhase) { lastPhase = G.run.phaseIdx; log.push(`[${(frames / 60).toFixed(1)}s] phase -> ${lastPhase}`); }
        if (G.run.seq !== lastSeq) { lastSeq = G.run.seq; log.push(`[${(frames / 60).toFixed(1)}s] seq -> ${lastSeq} remain=${G.run.remain?.toFixed(1)}`); }
        if (G.state !== 'play') break;
        /* リザルト到達で終了 */
        if (G.run.result) break;
        /* 敗北ルート: down後に z で進行 */
        if (G.state === 'gameover') break;
      }
      console.log(log.join('\n'));
      console.log('FINAL:', JSON.stringify({ state: G.state, result: G.run && G.run.result, lives: G.run && G.run.lives, hits: G.run && G.run.hits, frames, sec: (frames / 60).toFixed(1) }));
      if (diff === 'GODOWN' && G.state === 'gameover') {
        console.log('gameover画面に到達。40フレーム後にzキー押下…');
        vm.runInThisContext('for(let i=0;i<45;i++) simStep(); Input.edge.z = true; simStep();');
        console.log('state after Z:', G.state);
      }
    }

    /* ================= hud ================= */
    if (mode === 'hud') {
      vm.runInThisContext('Stages.startRun("NORMAL")');
      G.run.seq = 'fight'; G.run.seqT = 200;
      vm.runInThisContext('Stages.enterPhase(1); for(let i=0;i<400;i++) simStep()');
      shot('hud_play.png');
    }
    console.log('done:', mode);
  } catch (e) {
    console.error('QA FAIL:', e);
    process.exitCode = 1;
  }
})();
