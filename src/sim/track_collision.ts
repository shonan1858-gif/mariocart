import { kartParams } from '../data/kart_params';
import { findNearestTrackSample, track01 } from '../data/track01';
import type { KartState, SurfaceType } from './kart';

export function getSurfaceAtPosition(x: number, y: number): SurfaceType {
  const nearest = findNearestTrackSample(x, y);
  const absLat = Math.abs(nearest.lateral);
  const roadEdge = track01.width * 0.5 + track01.shoulderWidth;
  return absLat > roadEdge ? 'offroad' : 'road';
}

export function resolveTrackCollision(state: KartState): void {
  const nearest = findNearestTrackSample(state.x, state.y);

  const halfRoad = track01.width * 0.5;
  const halfPlayable = halfRoad + track01.shoulderWidth;
  const guardLimit = halfPlayable + track01.guardOffset;

  const absLat = Math.abs(nearest.lateral);
  const side = Math.sign(nearest.lateral) || 1;

  if (absLat <= halfPlayable) return;

  const hasGuard = side > 0 ? track01.guardLeft[nearest.pointIndex] : track01.guardRight[nearest.pointIndex];

  if (!hasGuard) {
    state.speed *= 0.96;
    return;
  }

  state.x = nearest.x + nearest.nx * guardLimit * side;
  state.y = nearest.y + nearest.ny * guardLimit * side;

  const vx = Math.cos(state.heading) * state.speed;
  const vy = Math.sin(state.heading) * state.speed;

  const nx = nearest.nx * side;
  const ny = nearest.ny * side;

  const dot = vx * nx + vy * ny;
  const rx = vx - (1 + kartParams.wallRestitution) * dot * nx;
  const ry = vy - (1 + kartParams.wallRestitution) * dot * ny;

  const tangentX = -ny;
  const tangentY = nx;
  const tangential = (rx * tangentX + ry * tangentY) * kartParams.wallFriction;

  let outX = tangentX * tangential;
  let outY = tangentY * tangential;

  outX *= kartParams.wallDamping;
  outY *= kartParams.wallDamping;

  const nextSpeed = Math.min(kartParams.maxSpeed * 0.7, Math.hypot(outX, outY));
  if (nextSpeed > 0.001) {
    state.heading = Math.atan2(outY, outX);
    state.speed = nextSpeed;
  } else {
    state.speed *= 0.4;
  }
}
