/* ============================================================
 * 常夜桜 main.js
 * 起動 / 固定60fpsループ / 状態描画
 * ============================================================ */
'use strict';

G.pauseGame = function () {
  if (G.state === 'play' && G.run && (G.run.seq === 'fight')) {
    G.state = 'pause';
    UI.enter('pause');
    SFX.ui();
  }
};
G.resumeGame = function () {
  if (G.state === 'pause') { G.state = 'play'; SFX.ui(); }
};

async function boot() {
  G.canvas = document.getElementById('game');
  G.ctx = ctx2(G.canvas);
  loadSave();
  seedRand(Date.now() & 0xffffffff);

  /* QA モード (?qa=1&seed=N) */
  const q = new URLSearchParams(location.search);
  if (q.get('qa')) {
    G.qa.on = true;
    if (q.get('seed')) G.qa.seed = parseInt(q.get('seed')) | 0;
    G.audio.unlock = () => {}; // テスト環境の無音化
    window.__G = G;
  }

  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('orientationchange', () => setTimeout(fitCanvas, 100));

  /* ドット絵フォント読み込み (DotGothic16/OFL) */
  try {
    const face = new FontFace('DotGothic16', 'url(assets/fonts/dotgothic16-subset.woff2)');
    await Promise.race([face.load(), new Promise((_, rj) => setTimeout(rj, 5000))]);
    document.fonts.add(face);
    G.fontReady = true;
  } catch (e) { G.fontReady = false; }

  buildSprites();
  buildIcons();
  Input.init(G.canvas);

  document.body.classList.add('playing');
  G.state = 'title';
  UI.enter('title');
  Music.start('title');

  /* メインループ: 固定60Hzシミュレーション */
  let last = performance.now(), acc = 0;
  const STEP = 1000 / 60;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = now - last;
    last = now;
    if (dt > 120) dt = 120; // 復帰時の暴走防止
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 4) { simStep(); acc -= STEP; n++; }
    if (n === 4) acc = 0;
    render();
  }
  requestAnimationFrame(frame);
}

function simStep() {
  G.time += 1 / 60;
  G.frame++;

  /* グローバルキー */
  if (Input.pressed('n')) { AudioSys.toggleMusic(); UI.bannerSmall(AudioSys.musicOn ? 'BGM: ON' : 'BGM: OFF'); }
  if (Input.pressed('m')) { AudioSys.toggleSfx(); UI.bannerSmall(AudioSys.sfxOn ? '効果音: ON' : '効果音: OFF'); }
  if (Input.pressed('f')) toggleFullscreen();
  if ((Input.pressed('Escape') || Input.pressed('p')) && G.state === 'play') G.pauseGame();

  switch (G.state) {
    case 'play': Stages.update(); break;
    case 'pause': UI.update(); break;
    default: {
      /* メニュー裏でも世界は呼吸する */
      Particles.update(false);
      UI.update();
      break;
    }
  }
  Input.consumeEdges();
}

function render() {
  const x = G.ctx;
  x.save();
  x.clearRect(0, 0, G.W, G.H);
  FX.applyTransform(x);

  const inPlay = G.state === 'play' || G.state === 'pause';
  const nightPhase = inPlay && G.run && G.run.phaseIdx === 6;

  drawBackground(x, G.time, { dark: nightPhase, dim: !inPlay });

  if (inPlay && G.run) {
    const seq = G.run.seq;
    if (seq === 'warning') {
      UI.drawWarning(x, G.run.seqT);
    } else {
      Boss.draw(x, G.time);
      Bullets.draw(x, G.time);
      Particles.draw(x, G.time);
      Player.draw(x, G.time);
      if (seq === 'intro') UI.drawIntro(x, G.run.seqT);
      if (seq === 'clear') UI.drawClear(x, G.run.seqT);
      if (seq === 'down') UI.drawDown(x, G.run.seqT);
    }
    /* フェーズ7: 常夜の闇ベール(弾と自機の後・HUDの前) */
    if (nightPhase && seq === 'fight') {
      x.save();
      x.globalAlpha = 0.30;
      x.drawImage(S.bg.darkVeil, 0, 0);
      x.restore();
    }
    UI.drawHUD(x);
    UI.drawBanners(x);
    UI.drawTouchPlayUI(x);
    if (G.state === 'pause') UI.drawPause(x);
  } else {
    Particles.draw(x, G.time);
    switch (G.state) {
      case 'title': UI.drawTitle(x); break;
      case 'difficulty': UI.drawDifficulty(x); break;
      case 'howto': UI.drawHowto(x); break;
      case 'result': UI.drawResult(x); break;
      case 'gameover': UI.drawGameover(x); break;
    }
  }

  FX.drawOverlay(x);
  x.restore();
}

function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      (document.getElementById('frame') || document.documentElement).requestFullscreen?.();
    } else document.exitFullscreen();
  } catch (e) { }
}

window.addEventListener('DOMContentLoaded', () => {
  boot().catch(err => {
    const el = document.getElementById('boot-msg');
    if (el) el.textContent = '起動に失敗しました: ' + err.message;
    console.error(err);
  });
});
