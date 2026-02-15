import { InputController } from '../io/input';
import type { IRenderer } from '../render/types';
import { findNearestTrackSample } from '../data/track01';
import { KartSim } from './kart';
import { getSurfaceAtPosition, resolveTrackCollision } from './track_collision';

const FIXED_DT = 1 / 60;
const MAX_ACCUM = 0.2;

export class Game {
  private readonly input = new InputController();
  private readonly kart = new KartSim();

  private running = false;
  private rafId = 0;
  private prevTime = 0;
  private accumulator = 0;

  private lap = 0;
  private prevProgress = 0;

  constructor(private readonly renderer: IRenderer) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.prevTime = performance.now();
    this.prevProgress = findNearestTrackSample(this.kart.state.x, this.kart.state.y).progress;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.input.dispose();
  }

  private loop = (time: number): void => {
    if (!this.running) return;

    const dt = Math.min((time - this.prevTime) / 1000, MAX_ACCUM);
    this.prevTime = time;
    this.accumulator += dt;

    while (this.accumulator >= FIXED_DT) {
      const surface = getSurfaceAtPosition(this.kart.state.x, this.kart.state.y);
      this.kart.update(this.input.getState(), FIXED_DT, surface);
      resolveTrackCollision(this.kart.state);
      this.updateLap();
      this.accumulator -= FIXED_DT;
    }

    this.renderer.render(this.kart.state, {
      lap: this.lap,
      wallBounce: this.kart.state.wallBounceTimer > 0,
      boostText: this.kart.state.boostTextTimer > 0 ? `BOOST ${this.kart.state.turboStage}` : ''
    });
    this.rafId = requestAnimationFrame(this.loop);
  };

  private updateLap(): void {
    const progress = findNearestTrackSample(this.kart.state.x, this.kart.state.y).progress;
    const speed = this.kart.state.speed;

    if (this.prevProgress > 0.88 && progress < 0.12 && speed > 0.5) {
      this.lap = Math.min(1, this.lap + 1);
    }

    this.prevProgress = progress;
  }
}
