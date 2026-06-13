import { GRID_SIZE, SPRITES } from './config.js';

const BOARD_BG = '#143420';
const BOARD_GRID = 'rgba(189, 255, 205, 0.08)';
const HEAD_FALLBACK = '#88f06f';
const BODY_FALLBACK = '#47bd5f';
const FOOD_FALLBACK = '#ff5f57';

export class Renderer {
  constructor(canvas, spriteUrl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.spriteSheet = new Image();
    this.spriteSheet.src = spriteUrl;
    this.spriteSheetReady = false;
    this.spriteSheet.addEventListener('load', () => {
      this.spriteSheetReady = true;
    });
  }

  render(state) {
    const cell = this.canvas.width / GRID_SIZE;
    this.drawBoard(cell);

    if (state.food) {
      this.drawSpriteOrCell(SPRITES.food, state.food, cell, FOOD_FALLBACK);
    }

    state.snake.forEach((segment, index) => {
      const sprite = index === 0 ? SPRITES.head : SPRITES.body;
      const color = index === 0 ? HEAD_FALLBACK : BODY_FALLBACK;
      this.drawSpriteOrCell(sprite, segment, cell, color);
    });
  }

  drawBoard(cell) {
    const { ctx, canvas } = this;
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = BOARD_GRID;
    ctx.lineWidth = 1;
    for (let index = 0; index <= GRID_SIZE; index += 1) {
      const pos = Math.round(index * cell) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvas.width, pos);
      ctx.stroke();
    }
  }

  drawSpriteOrCell(sprite, point, cell, fallbackColor) {
    const padding = Math.max(2, cell * 0.08);
    const targetX = point.x * cell + padding;
    const targetY = point.y * cell + padding;
    const targetSize = cell - padding * 2;

    if (this.spriteSheetReady) {
      this.ctx.drawImage(
        this.spriteSheet,
        sprite.x,
        sprite.y,
        sprite.size,
        sprite.size,
        targetX,
        targetY,
        targetSize,
        targetSize,
      );
      return;
    }

    this.ctx.fillStyle = fallbackColor;
    this.ctx.beginPath();
    this.ctx.roundRect(targetX, targetY, targetSize, targetSize, 8);
    this.ctx.fill();
  }
}
