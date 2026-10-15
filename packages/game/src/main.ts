import {
  buildSpriteAtlas, CanvasRenderer, createFixedLoop, createKeyboardInput,
  createPlaceholderManifest, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
  Simulation, type Pattern,
} from '@gds/engine';
import { STAGE1_PATTERNS, STAGE2_PATTERNS, BOSS_PATTERNS, DIFFICULTIES, applyDifficulty, type DifficultyConfig } from './patterns';
import { makeBackground, makeBoss } from './boss';
import { GameAudio } from './audio';

const STAGES: { name: string; patterns: Pattern[] }[] = [
  { name: 'STAGE 1 — 星屑の導入', patterns: STAGE1_PATTERNS },
  { name: 'STAGE 2 — 軌道の万華鏡', patterns: STAGE2_PATTERNS },
  { name: 'STAGE 3 — 幻奏ボス連戦', patterns: BOSS_PATTERNS },
];
const PHASE_NAMES = ['Ring Prelude','Aimed Fan','Spiral Garden','Twin Walls','Verdant Spiral','Golden Barrage','Dense Finale','Boss I — Overture','Boss II — Fanfare','Boss III — Bloom','Boss IV — Crossfire','FINAL — Astral Requiem'];

type State = 'title' | 'playing' | 'transition' | 'gameover' | 'allclear';

async function main(): Promise<void> {
  const app = document.getElementById('app'); if (!app) throw new Error('Missing #app');
  const canvas = document.createElement('canvas'); app.appendChild(canvas);
  const atlas = await buildSpriteAtlas(createPlaceholderManifest());
  const renderer = new CanvasRenderer(canvas, atlas);
  const input = createKeyboardInput(window);
  const audio = new GameAudio();

  const hud = document.getElementById('hud')!;
  const timerEl = document.getElementById('timer')!;
  const livesEl = document.getElementById('lives')!;
  const scoreEl = document.getElementById('score')!;
  const phaseEl = document.getElementById('phase')!;
  const msgEl = document.getElementById('msg')!;
  const creditsEl = document.getElementById('credits')!;

  // overlay menu
  const overlay = document.createElement('div');
  overlay.className = 'overlay active';
  overlay.innerHTML = `
    <div class="title">✦ ASTRAL BARRAGE ✦</div>
    <div class="subtitle">耐久型ドット絵弾幕 — 攻撃せず、避け続けて生き延びろ<br>
    矢印/WASD: 移動 · Shift: 低速(判定表示) · X: ボム(弾消し) · P: ポーズ · M: ミュート · F: 全画面</div>
    <div class="menu" id="diffMenu"></div>
    <div class="subtitle" style="margin-top:18px">難易度を選んで開始（クリック / Enter）</div>`;
  app.appendChild(overlay);
  const diffMenu = overlay.querySelector('#diffMenu') as HTMLElement;

  let diff: DifficultyConfig = DIFFICULTIES[1];
  let diffIndex = 1;
  let state: State = 'title';
  let stageIdx = 0, phaseIdx = 0; // global phase index within stage
  let flatPhase = 0;
  let sim: Simulation | null = null;
  let lives = 3, score = 0, bombs = 3, elapsedTotal = 0;
  let transitionTimer = 0, paused = false, shake = 0;
  let stagePatterns: Pattern[] = [];
  let allPatterns: Pattern[][] = [];
  let touch: { x: number; y: number; active: boolean } = { x: 0, y: 0, active: false };
  const wasd = { dx: 0, dy: 0 };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') wasd.dy = -1; if (e.code === 'KeyS') wasd.dy = 1;
    if (e.code === 'KeyA') wasd.dx = -1; if (e.code === 'KeyD') wasd.dx = 1;
    if (e.code === 'KeyM') { audio.setMuted(!audio.muted); showMsg(audio.muted ? 'MUTED' : 'SOUND ON', 600); }
    if (e.code === 'KeyF') { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); }
    if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'playing') { paused = !paused; showMsg(paused ? 'PAUSED' : '', paused ? 999999 : 0); if (!paused) msgEl.classList.remove('show'); }
    if (e.code === 'Enter' && state !== 'playing') startGame(diffIndex);
    if (state === 'title') {
      if (e.code === 'ArrowUp') selectDiff((diffIndex + DIFFICULTIES.length - 1) % DIFFICULTIES.length);
      if (e.code === 'ArrowDown') selectDiff((diffIndex + 1) % DIFFICULTIES.length);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' && wasd.dy < 0) wasd.dy = 0; if (e.code === 'KeyS' && wasd.dy > 0) wasd.dy = 0;
    if (e.code === 'KeyA' && wasd.dx < 0) wasd.dx = 0; if (e.code === 'KeyD' && wasd.dx > 0) wasd.dx = 0;
  });
  // touch / mouse drag
  const toField = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * PLAYFIELD_WIDTH, y: ((e.clientY - r.top) / r.height) * PLAYFIELD_HEIGHT };
  };
  canvas.addEventListener('pointerdown', (e) => { const p = toField(e); touch = { ...p, active: true }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (touch.active) { const p = toField(e); touch.x = p.x; touch.y = p.y; } });
  canvas.addEventListener('pointerup', () => { touch.active = false; });
  canvas.addEventListener('pointercancel', () => { touch.active = false; });

  function showMsg(text: string, ms = 1600) {
    msgEl.textContent = text;
    msgEl.classList.toggle('show', !!text);
    if (ms > 0 && ms < 100000) window.setTimeout(() => { if (msgEl.textContent === text) msgEl.classList.remove('show'); }, ms);
  }
  function selectDiff(i: number) {
    diffIndex = i; diff = DIFFICULTIES[i]; audio.sfx('select');
    [...diffMenu.children].forEach((c, j) => c.classList.toggle('sel', j === i));
  }
  DIFFICULTIES.forEach((d, i) => {
    const b = document.createElement('button');
    b.className = 'btn' + (i === diffIndex ? ' sel' : '');
    b.textContent = `${d.name}  —  残機${d.lives} / 弾速×${d.speedMul}`;
    b.onclick = () => { selectDiff(i); startGame(i); };
    diffMenu.appendChild(b);
  });

  function totalRemaining(): number {
    if (!sim) return 0;
    let t = Math.max(0, sim.pattern.duration - sim.time);
    for (let s = stageIdx; s < allPatterns.length; s++) {
      const start = s === stageIdx ? phaseIdx + 1 : 0;
      for (let p = start; p < allPatterns[s].length; p++) t += allPatterns[s][p].duration;
    }
    return t;
  }
  function fmt(sec: number) { const m = Math.floor(sec / 60); const s = Math.floor(sec % 60); return `${m}:${String(s).padStart(2, '0')}`; }

  function loadPhase() {
    const pattern = stagePatterns[phaseIdx];
    sim = new Simulation({ pattern, playerConfig: { speed: diff.playerSpeed, focusSpeed: diff.focusSpeed, hitboxRadius: diff.hitbox, invulnerabilitySeconds: diff.invuln, margin: 8 } });
    flatPhase = allPatterns.slice(0, stageIdx).flat().length + phaseIdx;
    renderer.backgroundDrawer = makeBackground(stageIdx, phaseIdx);
    renderer.bossDrawer = makeBoss(flatPhase);
    audio.intensity = Math.min(2, stageIdx + (phaseIdx >= 3 ? 1 : 0));
    phaseEl.textContent = `${STAGES[stageIdx].name}  ·  PHASE ${phaseIdx + 1}/${stagePatterns.length} — ${PHASE_NAMES[flatPhase] ?? pattern.name}  ·  残り ${fmt(totalRemaining())}`;
    showMsg(phaseIdx === 0 ? STAGES[stageIdx].name : `PHASE ${phaseIdx + 1} — ${PHASE_NAMES[flatPhase] ?? pattern.name}`, 1500);
    audio.sfx('phase');
  }
  function startGame(di: number) {
    selectDiff(di);
    audio.init(); audio.sfx('select');
    allPatterns = STAGES.map((s) => applyDifficulty(s.patterns, diff));
    stageIdx = 0; phaseIdx = 0; stagePatterns = allPatterns[0];
    lives = diff.lives; score = 0; bombs = 3; elapsedTotal = 0; paused = false;
    overlay.style.display = 'none'; hud.style.display = 'flex'; phaseEl.style.display = 'block'; creditsEl.style.display = 'block';
    state = 'playing';
    loadPhase();
  }
  function nextPhase() {
    phaseIdx++;
    if (phaseIdx >= stagePatterns.length) {
      stageIdx++;
      if (stageIdx >= allPatterns.length) {
        state = 'allclear'; audio.sfx('clear');
        showMsg(`✦ ALL CLEAR ✦  SCORE ${score}`, 999999);
        hud.style.display = 'none'; phaseEl.textContent = '全ステージ耐久成功！ Enterでタイトルへ';
        overlay.style.display = 'flex'; overlay.querySelector('.title')!.textContent = '✦ ALL CLEAR ✦';
        setTimeout(() => { state = 'title'; }, 300);
        return;
      }
      phaseIdx = 0; stagePatterns = allPatterns[stageIdx]; bombs = 3;
      audio.sfx('clear'); showMsg(`STAGE CLEAR! → ${STAGES[stageIdx].name}`, 2000);
    }
    state = 'playing'; loadPhase();
  }

  function fit() { renderer.resize(window.innerWidth, window.innerHeight); }
  window.addEventListener('resize', fit); fit();

  // demo sim for title backdrop
  sim = new Simulation({ pattern: STAGE1_PATTERNS[2] });
  renderer.backgroundDrawer = makeBackground(0, 2);
  renderer.bossDrawer = makeBoss(2);

  const loop = createFixedLoop({
    update(dt) {
      if (state === 'title' && sim) { sim.setPlayerInput({ dx: Math.sin(performance.now() / 900) * 0.4, dy: 0, focus: false }); sim.step(dt); if (sim.finished) sim.reset(); return; }
      if (state !== 'playing' || paused || !sim) return;
      const kb = input.read();
      let dx = kb.dx + wasd.dx, dy = kb.dy + wasd.dy;
      if (touch.active) {
        const dxT = touch.x - sim.player.x, dyT = touch.y - sim.player.y;
        const d = Math.hypot(dxT, dyT);
        if (d > 6) { dx = dxT / d; dy = dyT / d; } else { dx = 0; dy = 0; }
      }
      sim.setPlayerInput({ dx: Math.max(-1, Math.min(1, dx)), dy: Math.max(-1, Math.min(1, dy)), focus: kb.focus });
      if (input.wasPressed('KeyX') && bombs > 0) { bombs--; sim.bullets.clear(); score += 50; audio.sfx('phase'); showMsg('BOMB!', 500); }
      if (input.wasPressed('KeyR')) { loadPhase(); }
      const prevHits = sim.hits;
      sim.step(dt); elapsedTotal += dt; score = Math.floor(elapsedTotal * 10) + (score - Math.floor((elapsedTotal - dt) * 10) > 60 ? 0 : 0);
      score = Math.floor(elapsedTotal * 10);
      if (sim.hits > prevHits) {
        lives--; shake = 12; audio.sfx('hit');
        if (lives < 0) {
          state = 'gameover'; audio.sfx('gameover'); showMsg('GAME OVER — Enterでリトライ', 999999);
          setTimeout(() => { state = 'title'; overlay.style.display = 'flex'; hud.style.display = 'none'; phaseEl.style.display = 'none'; sim = new Simulation({ pattern: STAGE1_PATTERNS[2] }); }, 1200);
          return;
        }
        showMsg(`HIT! 残機 ${lives}`, 800);
      }
      // graze-free phase completion: survived duration
      if (sim.time >= sim.pattern.duration) { state = 'transition'; transitionTimer = 0.8; sim.bullets.clear(); }
    },
    render() {
      if (!sim) return;
      if (shake > 0) { canvas.style.transform = `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`; shake *= 0.85; if (shake < 0.5) { shake = 0; canvas.style.transform = ''; } }
      renderer.render(sim);
      if (state === 'transition') { transitionTimer -= 1 / 60; if (transitionTimer <= 0) nextPhase(); }
      if (state === 'playing' || state === 'transition') {
        livesEl.textContent = `${'♥'.repeat(Math.max(0, lives))} (ボム:${bombs})`;
        scoreEl.textContent = String(score);
        timerEl.textContent = fmt(totalRemaining());
        timerEl.style.color = totalRemaining() < 10 ? '#ff6b6b' : '#ffe066';
      }
    },
  });
  loop.start();
}

main().catch((e: unknown) => { console.error(e); document.getElementById('app')!.textContent = e instanceof Error ? e.message : String(e); });
