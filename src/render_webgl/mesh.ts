import type { TrackDefinition } from '../data/track01';

export type MeshData = {
  vertices: Float32Array;
  indices: Uint16Array;
};

function getNormalAt(track: TrackDefinition, i: number): { nx: number; ny: number } {
  const { centerLine } = track;
  const count = centerLine.length;
  const prev = centerLine[(i - 1 + count) % count];
  const next = centerLine[(i + 1) % count];
  const tx = next.x - prev.x;
  const ty = next.y - prev.y;
  const tLen = Math.hypot(tx, ty) || 1;
  return { nx: -ty / tLen, ny: tx / tLen };
}

export function createTrackRibbon(track: TrackDefinition, width = track.width, y = 0): MeshData {
  return createTrackBand(track, 0, width, y);
}

export function createTrackBand(
  track: TrackDefinition,
  innerWidth: number,
  outerWidth: number,
  y = 0
): MeshData {
  const { centerLine } = track;
  const count = centerLine.length;
  const halfInner = innerWidth * 0.5;
  const halfOuter = outerWidth * 0.5;
  const verts: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < count; i += 1) {
    const p = centerLine[i];
    const { nx, ny } = getNormalAt(track, i);

    const liX = p.x + nx * halfInner;
    const liY = p.y + ny * halfInner;
    const loX = p.x + nx * halfOuter;
    const loY = p.y + ny * halfOuter;

    const riX = p.x - nx * halfInner;
    const riY = p.y - ny * halfInner;
    const roX = p.x - nx * halfOuter;
    const roY = p.y - ny * halfOuter;

    verts.push(loX, y, loY);
    verts.push(liX, y, liY);
    verts.push(riX, y, riY);
    verts.push(roX, y, roY);
  }

  for (let i = 0; i < count; i += 1) {
    const ni = (i + 1) % count;
    const a = i * 4;
    const b = ni * 4;

    indices.push(a + 0, b + 0, a + 1);
    indices.push(a + 1, b + 0, b + 1);

    indices.push(a + 2, b + 2, a + 3);
    indices.push(a + 3, b + 2, b + 3);
  }

  return {
    vertices: new Float32Array(verts),
    indices: new Uint16Array(indices)
  };
}

export function createWallRibbon(track: TrackDefinition, offset: number, height: number): MeshData {
  const { centerLine, width } = track;
  const count = centerLine.length;
  const verts: number[] = [];
  const indices: number[] = [];

  for (const side of [1, -1] as const) {
    const base = verts.length / 3;
    const guards = side > 0 ? track.guardLeft : track.guardRight;

    for (let i = 0; i < count; i += 1) {
      const p = centerLine[i];
      const { nx, ny } = getNormalAt(track, i);

      const edgeDist = width * 0.5 + offset;
      const x = p.x + nx * edgeDist * side;
      const z = p.y + ny * edgeDist * side;

      verts.push(x, 0, z);
      verts.push(x, height, z);
    }

    for (let i = 0; i < count; i += 1) {
      const ni = (i + 1) % count;
      if (!guards[i] || !guards[ni]) continue;

      const b0 = base + i * 2;
      const t0 = b0 + 1;
      const b1 = base + ni * 2;
      const t1 = b1 + 1;

      indices.push(b0, b1, t0);
      indices.push(t0, b1, t1);
    }
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
    w, h, -d,
    -w, h, -d,
    -w, -h, d,
    w, -h, d,
    w, h, d,
    -w, h, d
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

export function createCylinderX(length: number, radius: number, segments = 14): MeshData {
  const half = length / 2;
  const verts: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const y = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;

    verts.push(-half, y, z);
    verts.push(half, y, z);
  }

  for (let i = 0; i < segments; i += 1) {
    const ni = (i + 1) % segments;
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

export function createSpectatorMeshes(): { body: MeshData; head: MeshData } {
  return {
    body: createCuboid(2.4, 4.2, 1.8),
    head: createCuboid(2.2, 2.2, 2.2)
  };
}
