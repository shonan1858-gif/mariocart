import { sampleTrackHeight, track01 } from '../data/track01';
import { kartParams } from '../data/kart_params';
import type { IRenderer } from '../render/types';
import type { KartState } from '../sim/kart';
import { createCuboid, createTrackRibbon, type MeshData } from './mesh';
import {
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
  mat4RotationY,
  mat4Scale,
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
  private readonly hud: HTMLDivElement;

  private cameraPos: [number, number, number] | null = null;
  private cameraTarget: [number, number, number] | null = null;
  private smoothedFov = Math.PI / 3.2;
  private lastRenderTimeMs = 0;
  private boostShakePhase = 0;

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

    const now = performance.now();
    const dt = this.lastRenderTimeMs > 0 ? Math.min(0.05, (now - this.lastRenderTimeMs) / 1000) : 1 / 60;
    this.lastRenderTimeMs = now;

    const kartHeight = sampleTrackHeight(state.x, state.y) + 4;
    const kartWorldX = state.x;
    const kartWorldY = kartHeight;
    const kartWorldZ = state.y;

    const forwardX = Math.cos(state.heading);
    const forwardZ = Math.sin(state.heading);

    const speedRatio = Math.min(1, Math.abs(state.speed) / kartParams.maxSpeed);
    const chaseDistance = 54 + speedRatio * 20;
    const chaseHeight = 28 + speedRatio * 6;
    const lookAhead = 24 + speedRatio * 8;
    const desiredCamera: [number, number, number] = [
      kartWorldX - forwardX * chaseDistance,
      kartWorldY + chaseHeight,
      kartWorldZ - forwardZ * chaseDistance
    ];
    const desiredTarget: [number, number, number] = [
      kartWorldX + forwardX * lookAhead,
      kartWorldY + 2,
      kartWorldZ + forwardZ * lookAhead
    ];

    if (!this.cameraPos || !this.cameraTarget) {
      this.cameraPos = [...desiredCamera];
      this.cameraTarget = [...desiredTarget];
    }

    const followLerp = 1 - Math.exp(-7.5 * dt);
    this.cameraPos[0] += (desiredCamera[0] - this.cameraPos[0]) * followLerp;
    this.cameraPos[1] += (desiredCamera[1] - this.cameraPos[1]) * followLerp;
    this.cameraPos[2] += (desiredCamera[2] - this.cameraPos[2]) * followLerp;
    this.cameraTarget[0] += (desiredTarget[0] - this.cameraTarget[0]) * followLerp;
    this.cameraTarget[1] += (desiredTarget[1] - this.cameraTarget[1]) * followLerp;
    this.cameraTarget[2] += (desiredTarget[2] - this.cameraTarget[2]) * followLerp;

    const baseFov = Math.PI / 3.3;
    const boostFov = Math.PI / 2.95;
    const desiredFov = baseFov + (boostFov - baseFov) * speedRatio;
    const fovLerp = 1 - Math.exp(-5.5 * dt);
    this.smoothedFov += (desiredFov - this.smoothedFov) * fovLerp;

    const camera = [...this.cameraPos] as [number, number, number];
    if (state.turboTimer > 0) {
      this.boostShakePhase += dt * 55;
      const shakeStrength = 0.45 + speedRatio * 0.55;
      camera[0] += Math.sin(this.boostShakePhase * 1.7) * shakeStrength;
      camera[1] += Math.sin(this.boostShakePhase * 2.8) * shakeStrength * 0.3;
      camera[2] += Math.cos(this.boostShakePhase * 2.1) * shakeStrength;
    } else {
      this.boostShakePhase += dt * 14;
    }

    const aspect = this.canvas.width / this.canvas.height;
    const proj = mat4Perspective(this.smoothedFov, aspect, 0.1, 2000);

    const view = mat4LookAt(camera, this.cameraTarget, [0, 1, 0]);
    const vp = mat4Multiply(proj, view);

    this.drawMesh(this.trackMesh, vp, mat4Scale(1, 1, 1), [0.16, 0.18, 0.22, 1]);

    const kartModel = mat4Multiply(
      mat4Translation(kartWorldX, kartWorldY, kartWorldZ),
      mat4RotationY(-state.heading + Math.PI / 2)
    );
    this.drawMesh(this.kartMesh, vp, kartModel, [0.92, 0.28, 0.23, 1]);

    this.hud.innerHTML = [
      `Speed: ${Math.abs(state.speed).toFixed(2)}`,
      `<span style="color:${['#94a3b8', '#60a5fa', '#fb923c', '#c084fc'][state.driftStage]}">Drift Stage: ${state.driftStage}</span>`,
      `Charge: ${state.driftCharge.toFixed(2)}`,
      'W/S accel-brake  A/D steer  Shift drift'
    ].join('<br/>');
  }

  private drawMesh(mesh: GpuMesh, vp: Float32Array, model: Float32Array, color: [number, number, number, number]): void {
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
