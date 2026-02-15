import type { KartState } from '../sim/kart';

export type RenderMeta = {
  lap: number;
};

export interface IRenderer {
  render(state: KartState, meta: RenderMeta): void;
}
