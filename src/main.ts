import { Game } from './sim/game';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('#app not found');
}

const canvas = document.createElement('canvas');
app.appendChild(canvas);

const game = new Game(canvas);
game.start();
