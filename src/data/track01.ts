export type TrackPoint = {
  x: number;
  y: number;
  z: number;
};

export type TrackDefinition = {
  centerLine: TrackPoint[];
  width: number;
};

export type NearestTrackSample = {
  x: number;
  y: number;
  nx: number;
  ny: number;
  tx: number;
  ty: number;
  lateral: number;
};

const SEGMENTS = 96;

const centerLine: TrackPoint[] = Array.from({ length: SEGMENTS }, (_, i) => {
  const t = (i / SEGMENTS) * Math.PI * 2;
  const x = 480 + Math.cos(t) * 300;
  const y = 300 + Math.sin(t) * 175;
  return { x, y, z: 0 };
});

export const track01: TrackDefinition = {
  centerLine,
  width: 92
};

export function sampleTrackHeight(_x: number, _y: number): number {
  return 0;
}

export function findNearestTrackSample(x: number, y: number): NearestTrackSample {
  const pts = track01.centerLine;
  let bestDistSq = Number.POSITIVE_INFINITY;
  let best: NearestTrackSample = {
    x: pts[0].x,
    y: pts[0].y,
    nx: 1,
    ny: 0,
    tx: 0,
    ty: 1,
    lateral: 0
  };

  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const sx = b.x - a.x;
    const sy = b.y - a.y;
    const segLenSq = sx * sx + sy * sy || 1;

    const apx = x - a.x;
    const apy = y - a.y;
    const t = Math.max(0, Math.min(1, (apx * sx + apy * sy) / segLenSq));

    const cx = a.x + sx * t;
    const cy = a.y + sy * t;
    const dx = x - cx;
    const dy = y - cy;
    const distSq = dx * dx + dy * dy;

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      const len = Math.hypot(sx, sy) || 1;
      const tx = sx / len;
      const ty = sy / len;
      const nx = -ty;
      const ny = tx;
      const lateral = dx * nx + dy * ny;

      best = { x: cx, y: cy, nx, ny, tx, ty, lateral };
    }
  }

  return best;
}
