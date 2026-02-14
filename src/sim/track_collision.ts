import { findNearestTrackSample, track01 } from '../data/track01';
import type { KartState } from './kart';

const SHOULDER_WIDTH = 18;
const GUARD_OFFSET = 8;

export function resolveTrackCollision(state: KartState): void {
  const nearest = findNearestTrackSample(state.x, state.y);
  const halfRoad = track01.width * 0.5;
  const halfPlayable = halfRoad + SHOULDER_WIDTH;
  const guardLimit = halfPlayable + GUARD_OFFSET;

  const absLat = Math.abs(nearest.lateral);
  const side = Math.sign(nearest.lateral) || 1;

  if (absLat > halfRoad) {
    state.speed *= 0.985;
  }

  if (absLat > halfPlayable) {
    const clamped = Math.min(absLat, guardLimit);
    state.x = nearest.x + nearest.nx * clamped * side;
    state.y = nearest.y + nearest.ny * clamped * side;
    state.speed *= 0.82;
  }
}
