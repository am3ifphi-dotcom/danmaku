import { parsePattern, type Pattern, type PatternInput } from '@gds/engine';

function make(input: PatternInput): Pattern {
  const r = parsePattern(input);
  if (!r.ok) throw new Error('Bad pattern: ' + r.errors.join('; '));
  return r.pattern;
}

function scale(p: Pattern, speedMul: number, intervalMul: number): Pattern {
  const input: PatternInput = {
    version: 1,
    id: p.id,
    name: p.name,
    duration: p.duration,
    seed: p.seed,
    emitters: p.emitters.map((e) => ({
      ...e,
      speed: e.speed * speedMul,
      acceleration: e.acceleration * speedMul,
      interval: e.interval / intervalMul,
    })) as any,
  };
  return make(input);
}

export interface DifficultyConfig {
  name: string;
  speedMul: number;
  intervalMul: number;
  lives: number;
  hitbox: number;
  invuln: number;
  playerSpeed: number;
  focusSpeed: number;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  { name: 'EASY', speedMul: 0.75, intervalMul: 0.85, lives: 5, hitbox: 2, invuln: 2.5, playerSpeed: 240, focusSpeed: 110 },
  { name: 'NORMAL', speedMul: 1.0, intervalMul: 1.0, lives: 3, hitbox: 2.5, invuln: 2.0, playerSpeed: 220, focusSpeed: 100 },
  { name: 'HARD', speedMul: 1.25, intervalMul: 1.2, lives: 2, hitbox: 2.5, invuln: 1.6, playerSpeed: 210, focusSpeed: 95 },
];

// ---- Base patterns (PatternInput) ----

const P1: PatternInput = {
  version: 1, id: 'intro-rings', name: 'Intro Rings', duration: 25, seed: 1,
  emitters: [
    { type: 'ring', start: 0, interval: 1.2, bullets: 16, speed: 90, spin: 8, sprite: 'rice-blue' },
    { type: 'ring', start: 2, interval: 1.6, bullets: 8, speed: 60, spin: -12, sprite: 'ball-purple' },
  ],
};

const P2: PatternInput = {
  version: 1, id: 'intro-spread', name: 'Intro Spread', duration: 25, seed: 2,
  emitters: [
    { type: 'spread', start: 0, interval: 0.9, bullets: 9, spread: 80, speed: 150, aimed: true, sprite: 'rice-red' },
    { type: 'ring', start: 1, interval: 1.4, bullets: 12, speed: 70, spin: 20, sprite: 'ball-green' },
  ],
};

const P3: PatternInput = {
  version: 1, id: 'intro-dense', name: 'Intro Dense', duration: 25, seed: 3,
  emitters: [
    { type: 'ring', start: 0, interval: 0.7, bullets: 24, speed: 80, spin: 15, sprite: 'rice-red' },
    { type: 'spiral', start: 0.5, interval: 0.05, streams: 3, speed: 110, spin: 90, sprite: 'rice-blue' },
  ],
};

const P4: PatternInput = {
  version: 1, id: 'variety-walls', name: 'Walls', duration: 25, seed: 4,
  emitters: [
    { type: 'spread', start: 0, interval: 1.0, bullets: 18, spread: 180, speed: 120, y: 0, angle: 90, sprite: 'rice-purple' },
    { type: 'spread', start: 0.5, interval: 1.0, bullets: 18, spread: 180, speed: 120, y: 448, angle: -90, sprite: 'rice-purple' },
  ],
};

const P5: PatternInput = {
  version: 1, id: 'variety-spiral', name: 'Spiral', duration: 25, seed: 5,
  emitters: [
    { type: 'spiral', start: 0, interval: 0.03, streams: 4, speed: 130, spin: 150, sprite: 'rice-green' },
    { type: 'ring', start: 1, interval: 1.2, bullets: 10, speed: 60, spin: -30, sprite: 'ball-blue' },
  ],
};

const P6: PatternInput = {
  version: 1, id: 'variety-aimed', name: 'Aimed Barrage', duration: 25, seed: 6,
  emitters: [
    { type: 'spread', start: 0, interval: 0.5, bullets: 11, spread: 50, speed: 200, aimed: true, sprite: 'star-yellow' },
    { type: 'spread', start: 0.25, interval: 0.5, bullets: 11, spread: 50, speed: 160, aimed: true, sprite: 'rice-red' },
  ],
};

const P7: PatternInput = {
  version: 1, id: 'variety-dense', name: 'Dense Finale', duration: 25, seed: 7,
  emitters: [
    { type: 'ring', start: 0, interval: 0.4, bullets: 32, speed: 70, spin: 25, sprite: 'rice-blue' },
    { type: 'ring', start: 0.2, interval: 0.4, bullets: 16, speed: 100, spin: -40, sprite: 'ball-red' },
    { type: 'spiral', start: 0.4, interval: 0.04, streams: 2, speed: 150, spin: 200, sprite: 'rice-purple' },
  ],
};

export const STAGE1_PATTERNS = [P1, P2, P3].map(make);
export const STAGE2_PATTERNS = [P4, P5, P6, P7].map(make);

// Stage 3 boss phases use these patterns
const B1: PatternInput = {
  version: 1, id: 'boss-phase1', name: 'Boss Phase 1', duration: 20, seed: 11,
  emitters: [
    { type: 'ring', start: 0, interval: 0.8, bullets: 20, speed: 80, spin: 10, sprite: 'rice-red' },
    { type: 'spiral', start: 0.3, interval: 0.05, streams: 3, speed: 120, spin: 100, sprite: 'rice-blue' },
  ],
};
const B2: PatternInput = {
  version: 1, id: 'boss-phase2', name: 'Boss Phase 2', duration: 20, seed: 12,
  emitters: [
    { type: 'spread', start: 0, interval: 0.6, bullets: 13, spread: 120, speed: 170, aimed: true, sprite: 'star-yellow' },
    { type: 'ring', start: 0.4, interval: 0.5, bullets: 28, speed: 60, spin: -20, sprite: 'ball-purple' },
  ],
};
const B3: PatternInput = {
  version: 1, id: 'boss-phase3', name: 'Boss Phase 3', duration: 20, seed: 13,
  emitters: [
    { type: 'ring', start: 0, interval: 0.35, bullets: 36, speed: 75, spin: 30, sprite: 'rice-green' },
    { type: 'spiral', start: 0, interval: 0.025, streams: 5, speed: 140, spin: 180, sprite: 'rice-red' },
  ],
};
const B4: PatternInput = {
  version: 1, id: 'boss-phase4', name: 'Boss Phase 4', duration: 20, seed: 14,
  emitters: [
    { type: 'spread', start: 0, interval: 0.4, bullets: 15, spread: 160, speed: 150, aimed: true, sprite: 'rice-blue' },
    { type: 'ring', start: 0.2, interval: 0.3, bullets: 40, speed: 55, spin: -15, sprite: 'ball-red' },
    { type: 'spiral', start: 0.4, interval: 0.02, streams: 2, speed: 180, spin: 240, sprite: 'star-yellow' },
  ],
};
const B5: PatternInput = {
  version: 1, id: 'boss-phase5', name: 'Boss Final', duration: 20, seed: 15,
  emitters: [
    { type: 'ring', start: 0, interval: 0.25, bullets: 48, speed: 65, spin: 45, sprite: 'rice-red' },
    { type: 'ring', start: 0.1, interval: 0.25, bullets: 24, speed: 110, spin: -60, sprite: 'ball-blue' },
    { type: 'spiral', start: 0.2, interval: 0.015, streams: 6, speed: 160, spin: 300, sprite: 'rice-purple' },
    { type: 'spread', start: 0.3, interval: 0.35, bullets: 13, spread: 100, speed: 200, aimed: true, sprite: 'star-yellow' },
  ],
};
export const BOSS_PATTERNS = [B1, B2, B3, B4, B5].map(make);

export function applyDifficulty(patterns: Pattern[], diff: DifficultyConfig): Pattern[] {
  return patterns.map((p) => scale(p, diff.speedMul, diff.intervalMul));
}
