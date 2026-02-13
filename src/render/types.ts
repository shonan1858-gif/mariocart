import type { KartState } from '../sim/kart';

export interface IRenderer {
  render(state: KartState): void;
}
