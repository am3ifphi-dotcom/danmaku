// Global configuration: logical resolution, difficulty table, storage keys.
export const W = 640;          // logical play-field width (px)
export const H = 360;          // logical play-field height (px)
export const FPS = 60;         // fixed simulation rate
export const SPRITE_SCALE = 2; // Pixel Frog sprites are drawn at an integer 2x to keep pixels crisp
// Player sprite opacity: translucent so bullets behind the ship stay readable.
// The hitbox dot is always drawn fully opaque.
export const PLAYER_ALPHA = 0.5;
export const SAVE_KEY = 'danmaku-save-v1';

// Difficulty table. Only numeric knobs; the phase scripts read these.
// speed   : bullet speed multiplier
// count   : number of bullets per emission multiplier
// interval: emission interval multiplier (bigger = more breathing room)
// homing  : homing turn-rate multiplier
// gap     : gap width multiplier for walls / rings (bigger = wider safe path)
// lives   : starting lives
// invuln  : invincibility after a hit (seconds)
export const DIFFICULTY = {
  easy: {
    key: 'easy', name: 'EASY', jp: 'やさしい',
    speed: 0.82, count: 0.75, interval: 1.25, homing: 0.5, gap: 1.45,
    lives: 5, invuln: 2.2, color: '#7fe3b4',
    desc: '弾は遅く数も少なめ。避け道が広い。初めての弾幕に。',
  },
  normal: {
    key: 'normal', name: 'NORMAL', jp: 'ふつう',
    speed: 1.0, count: 1.0, interval: 1.0, homing: 1.0, gap: 1.0,
    lives: 3, invuln: 1.7, color: '#9ec8ff',
    desc: '標準的な密度と速度。弾幕経験者向けの基準。',
  },
  hard: {
    key: 'hard', name: 'HARD', jp: 'むずかしい',
    speed: 1.2, count: 1.3, interval: 0.8, homing: 1.4, gap: 0.82,
    lives: 2, invuln: 1.3, color: '#ff8fb1',
    desc: '弾数・追尾が増し、避け道が狭い。経験者向け。',
  },
};

// Minimum gap width (in radians of the ring / px of wall) the design guarantees on every difficulty.
// Phase scripts clamp their gap parameters to these values so a route always exists.
export const MIN_GAP_RAD = 0.42;   // ~24 degrees
export const MIN_GAP_PX = 62;      // wall gap width in px

export const LS = {
  load() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; }
  },
  save(obj) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(obj)); } catch (e) { /* storage may be blocked */ }
  },
};
