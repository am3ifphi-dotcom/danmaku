/* ============================================================
 * 常夜桜 stages.js
 * 難易度設計 / フェーズ(章)進行 / ラン制御 / イントロ・クリア演出
 * ============================================================ */
'use strict';

/* ---------- 難易度: 「弾数」だけでなく軌道・空間・資源まで調整 ---------- */
const DIFFS = {
  EASY: {
    label: 'EASY', jp: '春花', color: '#7dffb8',
    spd: 0.85, cnt: 0.62, gap: 1.34, hom: 0.66, homT: 0.72,
    laserSpd: 0.8, laserW: 32, softCap: 460,
    durScale: 0.86, driftSpd: 0.85,
    speed: 4.5, speedFocus: 2.1,
    life: 5, invuln: 3.4, invulnSpawn: 3.4,
    mult: 1,
  },
  NORMAL: {
    label: 'NORMAL', jp: '夜桜', color: '#ffb7d5',
    spd: 1.0, cnt: 1.0, gap: 1.0, hom: 1.0, homT: 1.0,
    laserSpd: 1.0, laserW: 38, softCap: 820,
    durScale: 1.0, driftSpd: 1.0,
    speed: 4.5, speedFocus: 2.0,
    life: 3, invuln: 2.5, invulnSpawn: 2.6,
    mult: 1.6,
  },
  HARD: {
    label: 'HARD', jp: '常夜', color: '#ff6a5a',
    spd: 1.09, cnt: 1.42, gap: 0.78, hom: 1.45, homT: 1.15,
    laserSpd: 1.15, laserW: 42, softCap: 1150,
    durScale: 1.08, driftSpd: 1.22,
    speed: 4.6, speedFocus: 2.1,
    life: 2, invuln: 2.0, invulnSpawn: 2.2,
    mult: 2.4,
  },
};

/* ---------- 章(フェーズ)構成 ---------- */
const PHASES = [
  { name: '第一章『月下ノ舞』', sub: 'Dance Under the Moon', dur: 30, shiki: 0, build: d => Patterns.phase1(d) },
  { name: '第二章『桜吹雪』', sub: 'Sakura Blizzard', dur: 32, shiki: 0, build: d => Patterns.phase2(d) },
  { name: '第三章『式神・狐火』', sub: 'Shikigami: Foxfire', dur: 34, shiki: 4, build: d => Patterns.phase3(d) },
  { name: '第四章『注連結界』', sub: 'Sacred Boundary', dur: 32, shiki: 0, build: d => Patterns.phase4(d) },
  { name: '第五章『散華繚乱』', sub: 'Falling Petals, Riot of Flowers', dur: 34, shiki: 0, build: d => Patterns.phase5(d) },
  { name: '第六章『式神・追月』', sub: 'Shikigami: Moonchaser', dur: 32, shiki: 6, build: d => Patterns.phase6(d) },
  { name: '第七章『常夜ノ帳』', sub: 'Veil of Eternal Night', dur: 38, shiki: 4, build: d => Patterns.phase7(d) },
  { name: '終章『月詠終焉』', sub: 'The Last Moon Aria', dur: 40, shiki: 6, build: (d, durF) => Patterns.phase8(d, durF) },
];
const INTERLUDE = 92; // 章の幕間(秒数進行・弾は花弁へ)

/* ---------- シーケンス制御 ---------- */
const Stages = {
  get phaseDurF() { return Math.round(PHASES[G.run.phaseIdx].dur * 60 * G.run.diff.durScale); },

  startRun(diffKey) {
    const diff = DIFFS[diffKey];
    seedRand(G.qa.on ? G.qa.seed : (Date.now() & 0xffffffff));
    Bullets.reset();
    Particles.reset();
    Boss.state = 'hidden';
    G.run = {
      diff, diffKey,
      seq: 'warning', seqT: 0,
      phaseIdx: -1, phF: 0, interT: 0,
      emitters: [],
      total: 0, remain: 0,
      lives: diff.life, score: 0, graze: 0, hits: 0, maxBullets: 0,
      noMiss: true, timeT: 0,
      result: null, clearTime: 0,
      durFs: PHASES.map(p => Math.round(p.dur * 60 * diff.durScale)),
    };
    let tot = 0;
    for (let i = 0; i < PHASES.length; i++) { tot += G.run.durFs[i]; if (i < PHASES.length - 1) tot += INTERLUDE; }
    G.run.total = tot / 60;
    G.run.remain = G.run.total;
    Player.init();
    Bullets.MAX = diff.softCap + 200;
    SFX.warn();
    FX.vignetteDark = 0;
    G.state = 'play';
  },

  enterPhase(idx) {
    const run = G.run;
    run.phaseIdx = idx;
    run.phF = 0;
    const P = PHASES[idx];
    Boss.startTransition(idx, P.shiki);
    if (idx === 0) { Boss.state = 'idle'; Boss.phase = 0; Boss.setShiki(P.shiki); }
    run.emitters = P.build(run.diff, run.durFs[idx]);
    Music.setPhase(idx);
    UI.banner(P.name, P.sub, 150);
    SFX.phase();
  },

  killLasersFade() {
    for (const L of Bullets.lasers) {
      if (L.age < L.warm + L.act) L.act = Math.max(1, L.age - L.warm);
      L.fade = Math.min(L.fade, 24);
    }
  },

  update() {
    const run = G.run;
    if (!run) return;
    run.seqT++;
    FX.update(1 / 60);

    switch (run.seq) {
      /* ---- 警告 ---- */
      case 'warning': {
        if (run.seqT === 1) { FX.flash('#801020', 0.4, 0.3); }
        Particles.update(false);
        if (run.seqT >= 132 || (run.seqT > 40 && (Input.pressed('z') || Input.pressed('Enter') || Input.pressed('tap')))) {
          run.seq = 'intro'; run.seqT = 0;
          Boss.startIntro();
          Particles.reset();
        }
        return;
      }
      /* ---- ボス顕現 ---- */
      case 'intro': {
        Boss.update();
        Particles.update(false);
        if (run.seqT % 6 === 0) Particles.petalAt(rnd(0, G.W), rnd(0, 160), rndi(0, 2), 0, 0.4);
        if (run.seqT >= 165 || (run.seqT > 40 && (Input.pressed('z') || Input.pressed('Enter') || Input.pressed('tap')))) {
          run.seq = 'fight'; run.seqT = 0;
          Music.start('boss');
          this.enterPhase(0);
        }
        return;
      }

      case 'fight': {
        run.remain -= 1 / 60;
        run.timeT++;
        run.score += 0.6;
        const phDur = run.durFs[run.phaseIdx];

        Boss.update();
        Player.update();
        Patterns.tick();

        if (run.interT > 0) { /* 幕間 */
          run.interT--;
          if (run.interT === 0) this.enterPhase(run.phaseIdx + 1);
        } else {
          run.phF++;
          for (const em of run.emitters) {
            if (run.phF >= em.s && (em.e == null || run.phF <= em.e)) {
              em.fn(run.phF - em.s, run.phF);
            }
          }
          if (run.phF >= phDur) {
            Bullets.clearAll(true);
            this.killLasersFade();
            if (run.phaseIdx >= PHASES.length - 1) { // 全章踏破
              run.seq = 'clear'; run.seqT = 0;
              Boss.startDefeat();
              SFX.fanfare();
              FX.flash('#fff6d8', 0.7, 0.6);
              Particles.ring(Boss.x, Boss.y, 220, 'gold');
              return;
            }
            run.interT = INTERLUDE;
            UI.bannerSmall('幕間 — 次の舞、顕現…');
          }
        }

        Bullets.update();
        Particles.update(true);

        /* 残り10秒: 秒刻みの音 */
        if (run.remain <= 10.2 && run.remain > 0 && run.remain % 1 > 0.93) SFX.countTick();

        /* ゲームオーバー判定 */
        if (run.lives <= 0 && !Player.alive && Player.respawnT < 5) {
          run.seq = 'down'; run.seqT = 0;
          Music.stop();
          SFX.gameover();
          Bullets.clearAll(true);
          this.killLasersFade();
        }
        return;
      }

      /* ---- クリア演出 ---- */
      case 'clear': {
        Boss.update();
        Particles.update(true);
        if (run.seqT % 4 === 0 && run.seqT < 180) {
          Particles.petalAt(Boss.x + rnd(-90, 90), Boss.y + rnd(-60, 80), rndi(0, 2), rnd(-0.3, 0.3), rnd(0.3, 1.0));
        }
        if (run.seqT >= 264) this.finishRun(true);
        return;
      }

      /* ---- 敗北演出 ---- */
      case 'down': {
        Particles.update(true);
        if (run.seqT >= 150) { G.state = 'gameover'; UI.enter('gameover'); Music.start('title'); }
        return;
      }
    }
  },

  finishRun(cleared) {
    const run = G.run;
    const base = Math.round(run.score) + run.graze * 10 + (run.noMiss ? 20000 : 0);
    const final = Math.round(base * run.diff.mult);
    run.result = {
      cleared, score: final, graze: run.graze, hits: run.hits,
      maxBullets: run.maxBullets, noMiss: run.noMiss,
      time: run.total - run.remain,
      rank: cleared ? (run.noMiss ? 'S' : (run.hits <= 2 ? 'A' : (run.hits <= 5 ? 'B' : 'C'))) : '—',
    };
    if (cleared) {
      const s = G.save;
      if (final > (s.best[run.diffKey] || 0)) s.best[run.diffKey] = final;
      s.cleared[run.diffKey] = true;
      if (run.hits < s.missBest[run.diffKey]) s.missBest[run.diffKey] = run.hits;
      writeSave();
    }
    G.state = 'result';
    UI.enter('result');
    Music.start('title');
  },
};
