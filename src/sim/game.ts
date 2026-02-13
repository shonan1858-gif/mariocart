import { InputController } from '../io/input';
import { Renderer } from '../render/renderer';
import { KartSim } from './kart';

const FIXED_DT = 1 / 60;
const MAX_ACCUM = 0.2;

export class Game {
  private readonly input = new InputController();
  private readonly kart = new KartSim();
  private readonly renderer: Renderer;

  private running = false;
  private rafId = 0;
  private prevTime = 0;
  private accumulator = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.prevTime = performance.now();
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
      this.kart.update(this.input.getState(), FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.renderer.render(this.kart.state);
    this.rafId = requestAnimationFrame(this.loop);
  };
}
