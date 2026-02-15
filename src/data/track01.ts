export type TrackPoint = {
  x: number;
  y: number;
  z: number;
};

export type TrackDefinition = {
  centerLine: TrackPoint[];
  width: number;
  shoulderWidth: number;
  grassWidth: number;
  guardOffset: number;
  guardLeft: boolean[];
  guardRight: boolean[];
};

export type NearestTrackSample = {
  x: number;
  y: number;
  nx: number;
  ny: number;
  tx: number;
  ty: number;
  lateral: number;
  progress: number;
  pointIndex: number;
};

type TrackSegment =
  | { kind: 'straight'; length: number; step: number; hasGuardrailLeft: boolean; hasGuardrailRight: boolean }
  | {
      kind: 'curve';
      radius: number;
      angleDeg: number;
      dir: 'left' | 'right';
      stepDeg: number;
      hasGuardrailLeft: boolean;
      hasGuardrailRight: boolean;
    }
  | {
      kind: 's';
      radius: number;
      angleDeg: number;
      first: 'left' | 'right';
      stepDeg: number;
      hasGuardrailLeft: boolean;
      hasGuardrailRight: boolean;
    }
  | { kind: 'close'; step: number; hasGuardrailLeft: boolean; hasGuardrailRight: boolean };

const TRACK_SCALE = 3;

const segments: TrackSegment[] = [
  { kind: 'straight', length: 300 * TRACK_SCALE, step: 14 * TRACK_SCALE, hasGuardrailLeft: true, hasGuardrailRight: true },
  { kind: 'curve', radius: 120 * TRACK_SCALE, angleDeg: 72, dir: 'left', stepDeg: 4, hasGuardrailLeft: true, hasGuardrailRight: true },
  { kind: 'straight', length: 170 * TRACK_SCALE, step: 12 * TRACK_SCALE, hasGuardrailLeft: true, hasGuardrailRight: false },
  { kind: 's', radius: 85 * TRACK_SCALE, angleDeg: 55, first: 'right', stepDeg: 4, hasGuardrailLeft: false, hasGuardrailRight: true },
  { kind: 'straight', length: 180 * TRACK_SCALE, step: 12 * TRACK_SCALE, hasGuardrailLeft: false, hasGuardrailRight: false },
  { kind: 'curve', radius: 58 * TRACK_SCALE, angleDeg: 180, dir: 'left', stepDeg: 4, hasGuardrailLeft: true, hasGuardrailRight: true },
  { kind: 'straight', length: 260 * TRACK_SCALE, step: 12 * TRACK_SCALE, hasGuardrailLeft: true, hasGuardrailRight: false },
  { kind: 'curve', radius: 100 * TRACK_SCALE, angleDeg: 88, dir: 'right', stepDeg: 4, hasGuardrailLeft: false, hasGuardrailRight: true },
  { kind: 'straight', length: 180 * TRACK_SCALE, step: 12 * TRACK_SCALE, hasGuardrailLeft: true, hasGuardrailRight: true },
  { kind: 'close', step: 12 * TRACK_SCALE, hasGuardrailLeft: true, hasGuardrailRight: true }
];

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function generateTrack(): { centerLine: TrackPoint[]; guardLeft: boolean[]; guardRight: boolean[] } {
  const points: TrackPoint[] = [];
  const guardLeft: boolean[] = [];
  const guardRight: boolean[] = [];

  let x = 0;
  let y = 0;
  let heading = -Math.PI / 2;

  const pushPoint = (left: boolean, right: boolean): void => {
    points.push({ x, y, z: 0 });
    guardLeft.push(left);
    guardRight.push(right);
  };

  pushPoint(true, true);
  const startX = x;
  const startY = y;

  const addCurve = (
    radius: number,
    angleDeg: number,
    dir: 'left' | 'right',
    stepDeg: number,
    hasGuardrailLeft: boolean,
    hasGuardrailRight: boolean
  ): void => {
    const total = degToRad(angleDeg);
    const turnSign = dir === 'left' ? 1 : -1;
    const steps = Math.max(1, Math.ceil(Math.abs(total / degToRad(stepDeg))));
    const delta = total / steps;

    for (let i = 0; i < steps; i += 1) {
      const nextHeading = heading + delta * turnSign;
      const avgHeading = heading + (nextHeading - heading) * 0.5;
      const arcLen = radius * Math.abs(delta);
      x += Math.cos(avgHeading) * arcLen;
      y += Math.sin(avgHeading) * arcLen;
      heading = nextHeading;
      pushPoint(hasGuardrailLeft, hasGuardrailRight);
    }
  };

  for (const segment of segments) {
    if (segment.kind === 'straight') {
      const steps = Math.max(1, Math.ceil(segment.length / segment.step));
      const stepLen = segment.length / steps;
      for (let i = 0; i < steps; i += 1) {
        x += Math.cos(heading) * stepLen;
        y += Math.sin(heading) * stepLen;
        pushPoint(segment.hasGuardrailLeft, segment.hasGuardrailRight);
      }
      continue;
    }

    if (segment.kind === 'curve') {
      addCurve(
        segment.radius,
        segment.angleDeg,
        segment.dir,
        segment.stepDeg,
        segment.hasGuardrailLeft,
        segment.hasGuardrailRight
      );
      continue;
    }

    if (segment.kind === 's') {
      addCurve(
        segment.radius,
        segment.angleDeg,
        segment.first,
        segment.stepDeg,
        segment.hasGuardrailLeft,
        segment.hasGuardrailRight
      );
      addCurve(
        segment.radius,
        segment.angleDeg,
        segment.first === 'left' ? 'right' : 'left',
        segment.stepDeg,
        segment.hasGuardrailLeft,
        segment.hasGuardrailRight
      );
      continue;
    }

    const baseX = x;
    const baseY = y;
    const dx = startX - baseX;
    const dy = startY - baseY;
    const closeLen = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.ceil(closeLen / segment.step));

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      x = baseX + dx * t;
      y = baseY + dy * t;
      pushPoint(segment.hasGuardrailLeft, segment.hasGuardrailRight);
    }
  }

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;

  return {
    centerLine: points.map((p) => ({ x: p.x - cx + 480, y: p.y - cy + 300, z: 0 })),
    guardLeft,
    guardRight
  };
}

const generated = generateTrack();

export const track01: TrackDefinition = {
  centerLine: generated.centerLine,
  width: 84 * TRACK_SCALE,
  shoulderWidth: 20 * TRACK_SCALE,
  grassWidth: 220 * TRACK_SCALE,
  guardOffset: 7 * TRACK_SCALE,
  guardLeft: generated.guardLeft,
  guardRight: generated.guardRight
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
    lateral: 0,
    progress: 0,
    pointIndex: 0
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
      const progress = (i + t) / pts.length;

      best = { x: cx, y: cy, nx, ny, tx, ty, lateral, progress, pointIndex: i };
    }
  }

  return best;
}
