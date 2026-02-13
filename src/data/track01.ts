export type TrackPoint = {
  x: number;
  y: number;
  z: number;
};

export type TrackDefinition = {
  centerLine: TrackPoint[];
  width: number;
};

const SEGMENTS = 96;

const centerLine: TrackPoint[] = Array.from({ length: SEGMENTS }, (_, i) => {
  const t = (i / SEGMENTS) * Math.PI * 2;
  const x = 480 + Math.cos(t) * 300;
  const y = 300 + Math.sin(t) * 175;
  const z = Math.sin(t * 2.1) * 12 + Math.cos(t * 3.4) * 5;
  return { x, y, z };
});

export const track01: TrackDefinition = {
  centerLine,
  width: 90
};

export function sampleTrackHeight(x: number, y: number): number {
  let best = centerLine[0];
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (const p of centerLine) {
    const dx = x - p.x;
    const dy = y - p.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = p;
    }
  }

  return best.z;
}
