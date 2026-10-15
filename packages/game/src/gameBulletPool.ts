import { BulletPool } from '@gds/engine';

export const BEHAVIOR_NORMAL = 0;
export const BEHAVIOR_REFLECT = 1;
export const BEHAVIOR_HOMING = 2;
export const BEHAVIOR_TURNING = 3;

export class GameBulletPool extends BulletPool {
  readonly behavior: Uint8Array;
  readonly turnRate: Float32Array; // deg/s
  readonly homing: Float32Array;
  readonly maxSpeed: Float32Array;
  readonly age: Float32Array;
  readonly life: Float32Array;

  constructor(capacity: number) {
    super(capacity);
    this.behavior = new Uint8Array(capacity);
    this.turnRate = new Float32Array(capacity);
    this.homing = new Float32Array(capacity);
    this.maxSpeed = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
  }

  spawnEx(
    x: number, y: number, vx: number, vy: number, ax: number, ay: number,
    radius: number, sprite: number,
    behavior = BEHAVIOR_NORMAL,
    turnRate = 0,
    homing = 0,
    maxSpeed = 0,
    life = 0,
  ): number {
    const i = this.spawn(x, y, vx, vy, ax, ay, radius, sprite);
    if (i >= 0) {
      this.behavior[i] = behavior;
      this.turnRate[i] = turnRate;
      this.homing[i] = homing;
      this.maxSpeed[i] = maxSpeed > 0 ? maxSpeed : Math.hypot(vx, vy) || 1;
      this.age[i] = 0;
      this.life[i] = life;
    }
    return i;
  }

  override kill(i: number): void {
    // swap extra fields too
    if (i < 0 || i >= this.count) return;
    const last = this.count - 1;
    // call super first? super swaps base and decrements count; but we need last index before decrement. Replicate.
    if (i !== last) {
      this.x[i] = this.x[last];
      this.y[i] = this.y[last];
      this.vx[i] = this.vx[last];
      this.vy[i] = this.vy[last];
      this.ax[i] = this.ax[last];
      this.ay[i] = this.ay[last];
      this.radius[i] = this.radius[last];
      this.sprite[i] = this.sprite[last];
      this.behavior[i] = this.behavior[last];
      this.turnRate[i] = this.turnRate[last];
      this.homing[i] = this.homing[last];
      this.maxSpeed[i] = this.maxSpeed[last];
      this.age[i] = this.age[last];
      this.life[i] = this.life[last];
    }
    this.count = last;
  }

  integrateWithPlayer(dt: number, playerX: number, playerY: number, w: number, h: number): void {
    const { x, y, vx, vy, ax, ay, count, behavior, turnRate, homing, maxSpeed, age, life } = this;
    for (let i = 0; i < count; i++) {
      age[i] += dt;
      const b = behavior[i];
      // turning
      if (b === BEHAVIOR_TURNING && turnRate[i] !== 0) {
        const ang = Math.atan2(vy[i], vx[i]) + (turnRate[i] * Math.PI / 180) * dt;
        const sp = Math.hypot(vx[i], vy[i]);
        vx[i] = Math.cos(ang) * sp;
        vy[i] = Math.sin(ang) * sp;
      }
      // homing
      if (b === BEHAVIOR_HOMING && homing[i] > 0) {
        const dx = playerX - x[i];
        const dy = playerY - y[i];
        const d = Math.hypot(dx, dy) || 1;
        const tx = dx / d, ty = dy / d;
        vx[i] += tx * homing[i] * dt;
        vy[i] += ty * homing[i] * dt;
        const sp = Math.hypot(vx[i], vy[i]);
        const ms = maxSpeed[i] > 0 ? maxSpeed[i] : sp;
        if (sp > ms) { vx[i] = vx[i]/sp*ms; vy[i]=vy[i]/sp*ms; }
      }
      // acceleration
      vx[i] += ax[i] * dt;
      vy[i] += ay[i] * dt;
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;

      // reflect
      if (b === BEHAVIOR_REFLECT) {
        if (x[i] < 0) { x[i] = 0; vx[i] = Math.abs(vx[i]); }
        if (x[i] > w) { x[i] = w; vx[i] = -Math.abs(vx[i]); }
        if (y[i] < 0) { y[i] = 0; vy[i] = Math.abs(vy[i]); }
        if (y[i] > h) { y[i] = h; vy[i] = -Math.abs(vy[i]); }
      }
      if (life[i] > 0 && age[i] >= life[i]) {
        x[i] = -10000;
      }
    }
  }
}
