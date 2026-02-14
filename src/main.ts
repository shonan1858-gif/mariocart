import { Renderer } from './render/renderer';
import { Game } from './sim/game';
import { WebGLRenderer } from './render_webgl/renderer_webgl';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('#app not found');
}

app.style.position = 'relative';

const canvas = document.createElement('canvas');
app.appendChild(canvas);

const rendererParam = new URLSearchParams(window.location.search).get('renderer');
const useWebgl = rendererParam === 'webgl' || rendererParam === '3d' || rendererParam === null;
const renderer = useWebgl ? new WebGLRenderer(canvas) : new Renderer(canvas);

const game = new Game(renderer);
game.start();
