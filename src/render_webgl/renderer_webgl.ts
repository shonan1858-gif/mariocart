import { sampleTrackHeight, track01 } from '../data/track01';
import type { IRenderer } from '../render/types';
import type { KartState } from '../sim/kart';
import { createCuboid, createTrackRibbon, type MeshData } from './mesh';
import {
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
  mat4RotationY,
  mat4Translation
} from './math';

type GpuMesh = {
  vao: WebGLVertexArrayObject;
  indexCount: number;
};

export class WebGLRenderer implements IRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly mvpLoc: WebGLUniformLocation;
  private readonly colorLoc: WebGLUniformLocation;

  private readonly trackMesh: GpuMesh;
  private readonly kartMesh: GpuMesh;
  private readonly groundMesh: GpuMesh;
  private readonly sceneryMesh: GpuMesh;
  private readonly hud: HTMLDivElement;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;

    this.program = this.createProgram();
    const mvpLoc = gl.getUniformLocation(this.program, 'uMvp');
    const colorLoc = gl.getUniformLocation(this.program, 'uColor');
    if (!mvpLoc || !colorLoc) {
      throw new Error('Failed to locate shader uniforms');
    }

    this.mvpLoc = mvpLoc;
    this.colorLoc = colorLoc;

    this.trackMesh = this.uploadMesh(createTrackRibbon(track01));
    this.kartMesh = this.uploadMesh(createCuboid(16, 8, 24));
    this.groundMesh = this.uploadMesh(createCuboid(1400, 2, 1200));
    this.sceneryMesh = this.uploadMesh(createCuboid(26, 40, 26));

    this.hud = this.createHud();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  render(state: KartState): void {
    const gl = this.gl;

    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.62, 0.81, 0.98, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);

    const aspect = this.canvas.width / this.canvas.height;
    const proj = mat4Perspective(Math.PI / 3.2, aspect, 0.1, 2500);
    const view = mat4LookAt([0, 150, 220], [0, 0, 0], [0, 1, 0]);
    const vp = mat4Multiply(proj, view);

    const worldTransform = mat4Multiply(
      mat4RotationY(-state.heading),
      mat4Translation(-state.x, 0, -state.y)
    );

    this.drawMesh(
      this.groundMesh,
      vp,
      mat4Multiply(worldTransform, mat4Translation(480, -2, 300)),
      [0.14, 0.45, 0.20, 1]
    );

    this.drawMesh(this.trackMesh, vp, worldTransform, [0.18, 0.2, 0.25, 1]);

    this.drawScenery(vp, worldTransform);

    const kartHeight = sampleTrackHeight(state.x, state.y) + 4;
    const kartModel = mat4Translation(0, kartHeight, 0);
    this.drawMesh(this.kartMesh, vp, kartModel, [0.92, 0.28, 0.23, 1]);

    this.hud.innerHTML = [
      `Speed: ${Math.abs(state.speed).toFixed(2)}`,
      `<span style="color:${['#94a3b8', '#60a5fa', '#fb923c', '#c084fc'][state.driftStage]}">Drift Stage: ${state.driftStage}</span>`,
      `Charge: ${state.driftCharge.toFixed(2)}`,
      'Camera: fixed / world-rotating',
      'W/S accel-brake  A/D steer  Shift drift'
    ].join('<br/>');
  }

  private drawScenery(vp: Float32Array, worldTransform: Float32Array): void {
    const pillars = [
      [480, 20, 24],
      [840, 20, 300],
      [480, 20, 576],
      [120, 20, 300],
      [740, 20, 110],
      [220, 20, 500]
    ] as const;

    for (const [x, y, z] of pillars) {
      const model = mat4Multiply(worldTransform, mat4Translation(x, y, z));
      this.drawMesh(this.sceneryMesh, vp, model, [0.24, 0.31, 0.39, 1]);
    }
  }

  private drawMesh(
    mesh: GpuMesh,
    vp: Float32Array,
    model: Float32Array,
    color: [number, number, number, number]
  ): void {
    const gl = this.gl;
    const mvp = mat4Multiply(vp, model);

    gl.uniformMatrix4fv(this.mvpLoc, false, mvp);
    gl.uniform4f(this.colorLoc, color[0], color[1], color[2], color[3]);

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
      void main() {
        gl_Position = uMvp * vec4(aPos, 1.0);
      }
    `;

    const fragmentSrc = `#version 300 es
      precision mediump float;
      uniform vec4 uColor;
      out vec4 fragColor;
      void main() {
        fragColor = uColor;
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
