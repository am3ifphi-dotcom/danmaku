// Boss entity: multi-part sprite rig with explicit states
//   idle -> windup (anticipation, shown before a pattern) -> attack (fires) -> idle
//   hit (reaction to a close call / phase change), transition (phase change), defeat (stage cleared)
// Frame sequences come from the Pixel Frog / PixelRubro sprite pack (see CREDITS.md).
// Procedural motion (bobbing, sway, flash, shake, scale pulse) is layered on top of the frames.
import { SPRITE_SCALE, W, H } from './config.js';

const ANIM_FPS = 10; // Pixel Frog animations run at 10 fps (100 ms per frame)

export const BOSS_DEFS = {
  seashell: {
    name: 'Seashell',
    parts: [
      {
        dx: 0, dy: 0, flip: false,
        anims: {
          idle: 'seashell/seashell_idle',
          windup: 'seashell/seashell_opening',
          attack: 'seashell/seashell_fire',
          hit: 'seashell/seashell_hit',
          transition: 'seashell/seashell_hit',
          defeat: 'seashell/seashell_destroyed',
        },
        hold: { windup: 4 },   // hold the last opening frame while winding up
        loop: { idle: true },
      },
    ],
    muzzle: { dx: 0, dy: 6 },
    bob: 3,
  },
  crabby: {
    name: 'Crabby',
    parts: [
      {
        dx: 0, dy: 0, flip: false,
        anims: {
          idle: 'crabby/01-idle',
          windup: 'crabby/06-anticipation',
          attack: 'crabby/07-attack',
          hit: 'crabby/08-hit',
          transition: 'crabby/08-hit',
          defeat: 'crabby/09-dead_hit',
          defeat2: 'crabby/10-dead_ground',
        },
        hold: { windup: 2 },
        loop: { idle: true },
      },
      {
        // attack flash overlay drawn in front of the claws during the attack state only
        dx: 0, dy: -4, flip: false, onlyStates: ['attack'],
        anims: { attack: 'crabby/11-attack_effect' },
        loop: { attack: true },
      },
    ],
    muzzle: { dx: 0, dy: 12 },
    bob: 4,
  },
  totem: {
    name: 'Totem Trinity',
    parts: [
      // centre head (largest)
      {
        dx: 0, dy: 0, flip: false, tag: 'mid',
        anims: {
          idle: ['totem1/idle_1', 'totem1/idle_2'],
          windup: 'totem1/attack_1',
          attack: 'totem1/attack_2',
          hit: 'totem1/hit_1',
          transition: 'totem1/hit_2',
          defeat: 'totem1/destroyed',
        },
        hold: { windup: 1 },
        loop: { idle: true },
      },
      // left head
      {
        dx: -96, dy: 8, flip: false, tag: 'left',
        anims: {
          idle: ['totem2/idle_1', 'totem2/idle_2'],
          windup: 'totem2/attack_1',
          attack: 'totem2/attack_2',
          hit: 'totem2/hit_1',
          transition: 'totem2/hit_2',
          defeat: 'totem2/destroyed',
        },
        hold: { windup: 1 },
        loop: { idle: true },
      },
      // right head
      {
        dx: 96, dy: 8, flip: false, tag: 'right',
        anims: {
          idle: ['totem3/idle_1', 'totem3/idle_2'],
          windup: 'totem3/attack_1',
          attack: 'totem3/attack_2',
          hit: 'totem3/hit_1',
          transition: 'totem3/hit_2',
          defeat: 'totem3/destroyed',
        },
        hold: { windup: 1 },
        loop: { idle: true },
      },
    ],
    muzzle: { dx: 0, dy: 10 },
    bob: 2,
  },
};

export class Boss {
  constructor(sprites, kind) {
    this.sprites = sprites;
    this.def = BOSS_DEFS[kind];
    this.kind = kind;
    this.x = W / 2;
    this.y = 100;
    this.homeX = W / 2;
    this.homeY = 100;
    this.state = 'idle';
    this.stateT = 0;        // frames in the current state
    this.clock = 0;         // global frames
    this.flash = 0;         // white flash frames (hit reaction)
    this.shake = 0;         // shake frames
    this.pulse = 0;         // attack pulse scale
    this.dead = false;
    this.defeatFrames = 0;
    this.stateDur = { attack: 24, hit: 26, transition: 40, windup: 40 };
  }

  get muzzle() {
    const m = this.def.muzzle;
    return { x: this.x + m.dx, y: this.y + m.dy };
  }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.stateT = 0;
    if (s === 'attack') this.pulse = 10;
  }

  // Called each frame.
  update() {
    this.clock++;
    this.stateT++;
    if (this.flash > 0) this.flash--;
    if (this.shake > 0) this.shake--;
    if (this.pulse > 0) this.pulse--;
    // non-looping transient states fall back to idle
    const dur = this.stateDur[this.state];
    if (dur && this.stateT >= dur && this.state !== 'defeat') this.setState('idle');
    if (this.state === 'defeat') this.defeatFrames++;
    // move towards home (used by phases to glide)
    const k = this.state === 'transition' ? 0.06 : 0.025;
    this.x += (this.homeX - this.x) * k;
    this.y += (this.homeY - this.y) * k;
  }

  hit(flash = 8, shake = 10) { this.flash = flash; this.shake = shake; }

  // Pick the animation frame for a state, honouring `hold`/`loop` metadata.
  frameFor(part, state) {
    let key = part.anims[state];
    if (!key) return null;
    if (state === 'defeat' && this.defeatFrames > 60 && part.anims.defeat2) key = part.anims.defeat2;
    const frames = this.sprites.frames(key);
    if (!frames.length) return null;
    if (state === 'windup' && part.hold && part.hold.windup !== undefined) {
      return frames[Math.min(part.hold.windup, frames.length - 1)];
    }
    const idx = Math.floor(this.stateT * (ANIM_FPS / 60));
    if (part.loop && part.loop[state]) return frames[idx % frames.length];
    return frames[Math.min(idx, frames.length - 1)];
  }

  draw(g) {
    const bob = Math.sin(this.clock * 0.04) * this.def.bob;
    const sway = Math.sin(this.clock * 0.02) * 2;
    const shakeX = this.shake ? (Math.random() - 0.5) * 6 : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * 4 : 0;
    const pulse = this.pulse ? 1 + this.pulse * 0.004 : 1;
    for (const part of this.def.parts) {
      if (part.onlyStates && !part.onlyStates.includes(this.state)) continue;
      const img = this.frameFor(part, this.state);
      if (!img) continue;
      const pw = img.width * SPRITE_SCALE, ph = img.height * SPRITE_SCALE;
      // dx/dy are logical (640x360) pixels from the boss centre
      const cx = this.x + part.dx + (part.tag === 'left' ? -sway : part.tag === 'right' ? sway : 0) + shakeX;
      const cy = this.y + bob + part.dy + shakeY;
      g.save();
      g.imageSmoothingEnabled = false;
      g.translate(Math.round(cx), Math.round(cy));
      g.scale((part.flip ? -1 : 1) * pulse, pulse);
      if (this.flash > 0) g.filter = 'brightness(2.2)';
      g.drawImage(img, Math.round(-pw / 2), Math.round(-ph / 2), pw, ph);
      g.restore();
    }
  }
}
