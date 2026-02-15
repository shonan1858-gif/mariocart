import type { KartState } from '../sim/kart';

export type RenderMeta = {
  lap: number;
  wallBounce: boolean;
  boostText: string;
};

export interface IRenderer {
  render(state: KartState, meta: RenderMeta): void;
}
