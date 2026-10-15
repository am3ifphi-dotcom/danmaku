import {
  DEFAULT_BULLET_CAPACITY,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
  type PlayerInput,
  type SimulationOptions,
} from '@gds/engine';
import {
  Simulation,
  updatePlayer,
  isInvulnerable,
  findBulletHit,
  updateEmitter,
} from '@gds/engine';
import { GameBulletPool } from './gameBulletPool';

const CULL_MARGIN = 32;

export class GameSimulation extends Simulation {
  declare bullets: GameBulletPool;

  constructor(options: SimulationOptions) {
    super(options);
    (this as unknown as { bullets: GameBulletPool }).bullets =
      new GameBulletPool(options.capacity ?? DEFAULT_BULLET_CAPACITY);
  }

  // override step
  override step(dt: number): void {
    // replicate Simulation.step but with custom bullet integration
    this.time += dt;

    updatePlayer(this.player, this.input, dt);

    if (!this.patternEnded) {
      const ctx = { pool: this.bullets as any, playerX: this.player.x, playerY: this.player.y };
      for (const emitter of this.emitters as any) {
        updateEmitter(emitter, this.time, ctx);
      }
    }

    this.bullets.integrateWithPlayer(dt, this.player.x, this.player.y, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
    this.bullets.cullOutside(-CULL_MARGIN, -CULL_MARGIN, PLAYFIELD_WIDTH + CULL_MARGIN, PLAYFIELD_HEIGHT + CULL_MARGIN);

    // resolve hit
    const { player } = this;
    if (!isInvulnerable(player, this.time)) {
      const hit = findBulletHit(this.bullets as any, player.x, player.y, player.config.hitboxRadius);
      if (hit !== -1) {
        this.bullets.kill(hit);
        this.hits++;
        player.invulnerableUntil = this.time + player.config.invulnerabilitySeconds;
      }
    }
  }

  // expose input setter inherited
  override setPlayerInput(input: PlayerInput): void {
    super.setPlayerInput(input);
  }
}
