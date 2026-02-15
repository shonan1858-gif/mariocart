import { kartParams, trackParams } from '../data/kart_params';
import type { IRenderer, RenderMeta } from './types';
import type { KartState } from '../sim/kart';

export class Renderer implements IRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;

    this.canvas.width = 960;
    this.canvas.height = 600;
  }

  render(state: KartState, meta: RenderMeta): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawTrack();
    this.drawKart(state);
    this.drawHud(state, meta);
  }

  private drawTrack(): void {
    const { ctx } = this;

    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(
      trackParams.centerX,
      trackParams.centerY,
      trackParams.outerRadiusX,
      trackParams.outerRadiusY,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.ellipse(
      trackParams.centerX,
      trackParams.centerY,
      trackParams.innerRadiusX,
      trackParams.innerRadiusY,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.ellipse(trackParams.centerX, trackParams.centerY, 295, 170, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawKart(state: KartState): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.rotate(state.heading);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(
      -kartParams.kartLength / 2,
      -kartParams.kartWidth / 2,
      kartParams.kartLength,
      kartParams.kartWidth
    );

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(kartParams.kartLength / 6, -kartParams.kartWidth / 2, 8, kartParams.kartWidth);
    ctx.restore();
  }

  private drawHud(state: KartState, meta: RenderMeta): void {
    const { ctx } = this;
    const colorByStage = ['#94a3b8', '#60a5fa', '#fb923c', '#c084fc'];

    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(16, 16, 260, 138);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Speed: ${Math.abs(state.speed).toFixed(2)}`, 28, 44);
    ctx.fillStyle = colorByStage[state.driftStage];
    ctx.fillText(`Drift Stage: ${state.driftStage}`, 28, 70);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`Charge: ${state.driftCharge.toFixed(2)}`, 28, 96);
    ctx.fillText(`Lap: ${meta.lap}/1`, 28, 122);
    ctx.fillText('W accel / Shift brake / A,D steer / Space drift', 28, 144);
  }
}
