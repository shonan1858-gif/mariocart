import { findNearestTrackSample, track01 } from '../data/track01';
import type { KartState } from './kart';

export function resolveTrackCollision(state: KartState): void {
  const nearest = findNearestTrackSample(state.x, state.y);
  const halfRoad = track01.width * 0.5;
  const halfPlayable = halfRoad + track01.shoulderWidth;
  const guardLimit = halfPlayable + track01.guardOffset;

  const absLat = Math.abs(nearest.lateral);
  const side = Math.sign(nearest.lateral) || 1;

  if (absLat > halfRoad) {
    state.speed *= 0.982;
  }

  if (absLat > halfPlayable) {
    state.x = nearest.x + nearest.nx * guardLimit * side;
    state.y = nearest.y + nearest.ny * guardLimit * side;
    state.speed *= 0.78;
  }
}
