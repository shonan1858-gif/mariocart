import { sampleTrackHeight, track01 } from '../data/track01';
import type { IRenderer, RenderMeta } from '../render/types';
import type { KartState } from '../sim/kart';
import {
  createCuboid,
  createCylinderX,
  createSpectatorMeshes,
  createTrackBand,
  createTrackRibbon,
  createWallRibbon,
  type MeshData
} from './mesh';
import { mat4LookAt, mat4Multiply, mat4Perspective, mat4RotationY, mat4Translation } from './math';

type GpuMesh = {
  vao: WebGLVertexArrayObject;
  indexCount: number;
};

export class WebGLRenderer implements IRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly mvpLoc: WebGLUniformLocation;
  private readonly modelLoc: WebGLUniformLocation;
  private readonly colorLoc: WebGLUniformLocation;
  private readonly timeLoc: WebGLUniformLocation;
  private readonly glowLoc: WebGLUniformLocation;

  private readonly roadMesh: GpuMesh;
  private readonly shoulderMesh: GpuMesh;
  private readonly guardMesh: GpuMesh;
  private readonly groundMesh: GpuMesh;
  private readonly bodyMesh: GpuMesh;
  private readonly tireMesh: GpuMesh;
  private readonly charBodyMesh: GpuMesh;
  private readonly charHeadMesh: GpuMesh;
  private readonly spectatorBodyMesh: GpuMesh;
  private readonly spectatorHeadMesh: GpuMesh;
  private readonly startLineMesh: GpuMesh;
  private readonly hud: HTMLDivElement;

  private readonly startedAt = performance.now();
  private camPos: [number, number, number] | null = null;
  private camTarget: [number, number, number] | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;

    this.program = this.createProgram();

    const mvpLoc = gl.getUniformLocation(this.program, 'uMvp');
    const modelLoc = gl.getUniformLocation(this.program, 'uModel');
    const colorLoc = gl.getUniformLocation(this.program, 'uColor');
    const timeLoc = gl.getUniformLocation(this.program, 'uTime');
    const glowLoc = gl.getUniformLocation(this.program, 'uGlowMode');

    if (!mvpLoc || !modelLoc || !colorLoc || !timeLoc || !glowLoc) {
      throw new Error('Failed to locate shader uniforms');
    }

    this.mvpLoc = mvpLoc;
    this.modelLoc = modelLoc;
    this.colorLoc = colorLoc;
    this.timeLoc = timeLoc;
    this.glowLoc = glowLoc;

    this.roadMesh = this.uploadMesh(createTrackRibbon(track01, track01.width, 0.05));
    this.shoulderMesh = this.uploadMesh(
      createTrackBand(track01, track01.width, track01.width + track01.shoulderWidth * 2, 0.03)
    );
    this.guardMesh = this.uploadMesh(
      createWallRibbon(track01, track01.shoulderWidth + track01.guardOffset, 7)
    );
    this.groundMesh = this.uploadMesh(createCuboid(2200, 2, 1900));

    this.bodyMesh = this.uploadMesh(createCuboid(12, 4.2, 18));
    this.tireMesh = this.uploadMesh(createCylinderX(3.5, 2));
    this.charBodyMesh = this.uploadMesh(createCuboid(3.2, 4.5, 3));
    this.charHeadMesh = this.uploadMesh(createCuboid(3.8, 3.8, 3.8));

    const spectator = createSpectatorMeshes();
    this.spectatorBodyMesh = this.uploadMesh(spectator.body);
    this.spectatorHeadMesh = this.uploadMesh(spectator.head);

    this.startLineMesh = this.uploadMesh(createCuboid(track01.width - 6, 0.25, 5.5));

    this.hud = this.createHud();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  render(state: KartState, meta: RenderMeta): void {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.56, 0.79, 0.98, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const tSec = (performance.now() - this.startedAt) * 0.001;
    gl.uniform1f(this.timeLoc, tSec);

    const kartPos: [number, number, number] = [state.x, sampleTrackHeight(state.x, state.y) + 2.1, state.y];
    const forward: [number, number, number] = [Math.cos(state.heading), 0, Math.sin(state.heading)];

    const desiredCam: [number, number, number] = [
      kartPos[0] - forward[0] * 36,
      kartPos[1] + 14,
      kartPos[2] - forward[2] * 36
    ];
    const desiredTarget: [number, number, number] = [
      kartPos[0] + forward[0] * 18,
      kartPos[1] + 4.8,
      kartPos[2] + forward[2] * 18
    ];

    if (!this.camPos || !this.camTarget) {
      this.camPos = desiredCam;
      this.camTarget = desiredTarget;
    } else {
      this.camPos = this.lerpVec3(this.camPos, desiredCam, 0.12);
      this.camTarget = this.lerpVec3(this.camTarget, desiredTarget, 0.2);
    }

    const aspect = this.canvas.width / this.canvas.height;
    const proj = mat4Perspective(Math.PI / 3.5, aspect, 0.1, 3000);
    const view = mat4LookAt(this.camPos, this.camTarget, [0, 1, 0]);
    const vp = mat4Multiply(proj, view);

    this.drawMesh(this.groundMesh, vp, mat4Translation(480, -1.4, 300), [0.30, 0.68, 0.22, 1]);
    this.drawMesh(this.shoulderMesh, vp, mat4Translation(0, 0, 0), [0.54, 0.55, 0.58, 1]);
    this.drawMesh(this.roadMesh, vp, mat4Translation(0, 0, 0), [0.06, 0.06, 0.07, 1]);
    this.drawMesh(this.guardMesh, vp, mat4Translation(0, 0, 0), [0.78, 0.86, 1.0, 1], true);

    this.drawSpectators(vp);
    this.drawStartLine(vp);

    const kartBase = mat4Multiply(
      mat4Translation(kartPos[0], kartPos[1], kartPos[2]),
      mat4RotationY(-state.heading + Math.PI / 2)
    );

    this.drawMesh(this.bodyMesh, vp, kartBase, [0.14, 0.44, 0.93, 1]);

    const wheelOffsets: Array<[number, number, number]> = [
      [-6.2, -1.6, -5.8],
      [6.2, -1.6, -5.8],
      [-6.2, -1.6, 5.8],
      [6.2, -1.6, 5.8]
    ];

    for (const [x, y, z] of wheelOffsets) {
      const wheelModel = mat4Multiply(kartBase, mat4Translation(x, y, z));
      this.drawMesh(this.tireMesh, vp, wheelModel, [0.05, 0.05, 0.07, 1]);
    }

    const charBodyModel = mat4Multiply(kartBase, mat4Translation(0, 4.4, -0.5));
    const charHeadModel = mat4Multiply(kartBase, mat4Translation(0, 8.3, -0.5));
    this.drawMesh(this.charBodyMesh, vp, charBodyModel, [0.95, 0.83, 0.22, 1]);
    this.drawMesh(this.charHeadMesh, vp, charHeadModel, [0.98, 0.89, 0.72, 1]);

    this.hud.innerHTML = [
      `Lap: ${meta.lap}/1`,
      `Speed: ${Math.abs(state.speed).toFixed(2)}`,
      `<span style="color:${['#94a3b8', '#60a5fa', '#fb923c', '#c084fc'][state.driftStage]}">Drift Stage: ${state.driftStage}</span>`,
      `Charge: ${state.driftCharge.toFixed(2)}`,
      'W accel / Shift brake / A,D steer / Space drift'
    ].join('<br/>');
  }

  private drawSpectators(vp: Float32Array): void {
    const step = 8;
    const outer = track01.width * 0.5 + track01.shoulderWidth + track01.grassWidth * 0.45;

    for (let i = 0; i < track01.centerLine.length; i += step) {
      const p = track01.centerLine[i];
      const n = track01.centerLine[(i + 1) % track01.centerLine.length];
      const tx = n.x - p.x;
      const ty = n.y - p.y;
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len;
      const ny = tx / len;

      for (const side of [1, -1] as const) {
        const x = p.x + nx * outer * side;
        const z = p.y + ny * outer * side;
        const body = mat4Translation(x, 2.4, z);
        const head = mat4Translation(x, 5.5, z);
        const tone: [number, number, number, number] =
          side > 0 ? [0.88, 0.45, 0.47, 1] : [0.42, 0.66, 0.92, 1];
        this.drawMesh(this.spectatorBodyMesh, vp, body, tone);
        this.drawMesh(this.spectatorHeadMesh, vp, head, [0.95, 0.86, 0.72, 1]);
      }
    }
  }

  private drawStartLine(vp: Float32Array): void {
    const p0 = track01.centerLine[0];
    const p1 = track01.centerLine[1];
    const heading = Math.atan2(p1.y - p0.y, p1.x - p0.x);

    const lineModel = mat4Multiply(
      mat4Translation(p0.x, 0.14, p0.y),
      mat4RotationY(-heading + Math.PI / 2)
    );

    this.drawMesh(this.startLineMesh, vp, lineModel, [0.98, 0.98, 0.98, 1]);
  }

  private lerpVec3(
    a: [number, number, number],
    b: [number, number, number],
    t: number
  ): [number, number, number] {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  private drawMesh(
    mesh: GpuMesh,
    vp: Float32Array,
    model: Float32Array,
    color: [number, number, number, number],
    glow = false
  ): void {
    const gl = this.gl;
    const mvp = mat4Multiply(vp, model);

    gl.uniformMatrix4fv(this.mvpLoc, false, mvp);
    gl.uniformMatrix4fv(this.modelLoc, false, model);
    gl.uniform4f(this.colorLoc, color[0], color[1], color[2], color[3]);
    gl.uniform1f(this.glowLoc, glow ? 1 : 0);

    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  private uploadMesh(mesh: MeshData): GpuMesh {
    const gl = this.gl;

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    const ibo = gl.createBuffer();
    if (!vao || !vbo || !ibo) throw new Error('Failed to create GL buffers');

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    return { vao, indexCount: mesh.indices.length };
  }

  private createProgram(): WebGLProgram {
    const gl = this.gl;

    const vertexSrc = `#version 300 es
      layout(location = 0) in vec3 aPos;
      uniform mat4 uMvp;
      uniform mat4 uModel;
      out vec3 vWorldPos;
      void main() {
        vec4 world = uModel * vec4(aPos, 1.0);
        vWorldPos = world.xyz;
        gl_Position = uMvp * vec4(aPos, 1.0);
      }
    `;

    const fragmentSrc = `#version 300 es
      precision mediump float;
      uniform vec4 uColor;
      uniform float uTime;
      uniform float uGlowMode;
      in vec3 vWorldPos;
      out vec4 fragColor;
      void main() {
        vec3 color = uColor.rgb;
        if (uGlowMode > 0.5) {
          float flow = sin((vWorldPos.x + vWorldPos.z) * 0.07 + uTime * 3.0) * 0.5 + 0.5;
          color += vec3(0.12, 0.2, 0.32) * flow;
        }
        fragColor = vec4(color, uColor.a);
      }
    `;

    const vert = this.compile(gl.VERTEX_SHADER, vertexSrc);
    const frag = this.compile(gl.FRAGMENT_SHADER, fragmentSrc);

    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Shader link error: ${gl.getProgramInfoLog(program)}`);
    }

    return program;
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
    }

    return shader;
  }

  private createHud(): HTMLDivElement {
    const hud = document.createElement('div');
    hud.style.position = 'absolute';
    hud.style.left = '16px';
    hud.style.top = '16px';
    hud.style.padding = '10px 12px';
    hud.style.background = 'rgba(2, 6, 23, 0.78)';
    hud.style.color = '#e2e8f0';
    hud.style.font = '16px sans-serif';
    hud.style.lineHeight = '1.45';
    hud.style.borderRadius = '6px';

    const parent = this.canvas.parentElement;
    if (!parent) throw new Error('Canvas parent missing');
    parent.appendChild(hud);

    return hud;
  }

  private resize = (): void => {
    const cssWidth = this.canvas.clientWidth;
    const cssHeight = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(cssWidth * devicePixelRatio));
    this.canvas.height = Math.max(1, Math.floor(cssHeight * devicePixelRatio));
  };
}
