import type { TrackDefinition } from '../data/track01';

export type MeshData = {
  vertices: Float32Array;
  indices: Uint16Array;
};

export function createTrackRibbon(track: TrackDefinition): MeshData {
  const { centerLine, width } = track;
  const count = centerLine.length;
  const halfWidth = width * 0.5;
  const verts: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < count; i += 1) {
    const p = centerLine[i];
    const prev = centerLine[(i - 1 + count) % count];
    const next = centerLine[(i + 1) % count];

    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tLen = Math.hypot(tx, ty) || 1;
    const nx = -ty / tLen;
    const ny = tx / tLen;

    const lx = p.x + nx * halfWidth;
    const ly = p.y + ny * halfWidth;
    const rx = p.x - nx * halfWidth;
    const ry = p.y - ny * halfWidth;

    verts.push(lx, p.z, ly);
    verts.push(rx, p.z, ry);
  }

  for (let i = 0; i < count; i += 1) {
    const ni = (i + 1) % count;
    const l0 = i * 2;
    const r0 = l0 + 1;
    const l1 = ni * 2;
    const r1 = l1 + 1;

    indices.push(l0, r0, l1);
    indices.push(r0, r1, l1);
  }

  return {
    vertices: new Float32Array(verts),
    indices: new Uint16Array(indices)
  };
}

export function createCuboid(width: number, height: number, depth: number): MeshData {
  const w = width / 2;
  const h = height / 2;
  const d = depth / 2;

  const vertices = new Float32Array([
    -w, -h, -d,
     w, -h, -d,
     w,  h, -d,
    -w,  h, -d,
    -w, -h,  d,
     w, -h,  d,
     w,  h,  d,
    -w,  h,  d
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    3, 2, 6, 3, 6, 7,
    0, 3, 7, 0, 7, 4,
    1, 5, 6, 1, 6, 2
  ]);

  return { vertices, indices };
}
