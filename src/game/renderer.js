(function () {
  const { GRID_SIZE } = window.SnakeConfig;

  const BOARD_BG = '#143420';
  const BOARD_GRID = 'rgba(189, 255, 205, 0.08)';
  const HEAD_FILL = '#8cf06f';
  const HEAD_HIGHLIGHT = '#d9ffc9';
  const BODY_FILL = '#47bd5f';
  const BODY_HIGHLIGHT = '#a7ff9b';
  const FOOD_FILL = '#ff5f57';
  const FOOD_HIGHLIGHT = '#ffc27d';
  const FOOD_LEAF = '#68d85a';
  const DARK_DETAIL = '#051c0d';

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }

    render(state) {
      const cell = this.canvas.width / GRID_SIZE;
      this.drawBoard(cell);

      if (state.food) {
        this.drawFood(state.food, cell);
      }

      state.snake.forEach((segment, index) => {
        if (index === 0) {
          this.drawHead(segment, cell);
          return;
        }
        this.drawBody(segment, cell, index);
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

    drawHead(point, cell) {
      const { x, y, size } = this.getCellBox(point, cell, 0.1);
      const radius = size * 0.32;

      this.drawRoundedSquare(x, y, size, radius, HEAD_HIGHLIGHT);
      this.drawRoundedSquare(x + size * 0.06, y + size * 0.06, size * 0.88, radius * 0.75, HEAD_FILL);

      this.ctx.fillStyle = DARK_DETAIL;
      this.ctx.beginPath();
      this.ctx.arc(x + size * 0.34, y + size * 0.36, size * 0.08, 0, Math.PI * 2);
      this.ctx.arc(x + size * 0.66, y + size * 0.36, size * 0.08, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = DARK_DETAIL;
      this.ctx.lineWidth = Math.max(2, size * 0.06);
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.arc(x + size * 0.5, y + size * 0.55, size * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
      this.ctx.stroke();
    }

    drawBody(point, cell, index) {
      const { x, y, size } = this.getCellBox(point, cell, 0.12);
      const radius = size * 0.3;
      const offset = index % 2 === 0 ? 0.25 : 0.75;

      this.drawRoundedSquare(x, y, size, radius, BODY_HIGHLIGHT);
      this.drawRoundedSquare(x + size * 0.06, y + size * 0.06, size * 0.88, radius * 0.75, BODY_FILL);

      this.ctx.strokeStyle = BODY_HIGHLIGHT;
      this.ctx.lineWidth = Math.max(2, size * 0.08);
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(x + size * 0.22, y + size * offset);
      this.ctx.quadraticCurveTo(x + size * 0.5, y + size * (1 - offset), x + size * 0.78, y + size * offset);
      this.ctx.stroke();
    }

    drawFood(point, cell) {
      const { x, y, size } = this.getCellBox(point, cell, 0.14);
      const centerX = x + size * 0.5;
      const centerY = y + size * 0.58;
      const radius = size * 0.34;

      this.ctx.fillStyle = FOOD_HIGHLIGHT;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius * 1.12, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = FOOD_FILL;
      this.ctx.beginPath();
      this.ctx.arc(centerX - radius * 0.25, centerY, radius, 0, Math.PI * 2);
      this.ctx.arc(centerX + radius * 0.25, centerY, radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#794c22';
      this.ctx.lineWidth = Math.max(2, size * 0.08);
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, y + size * 0.28);
      this.ctx.lineTo(centerX + size * 0.08, y + size * 0.08);
      this.ctx.stroke();

      this.ctx.fillStyle = FOOD_LEAF;
      this.ctx.beginPath();
      this.ctx.ellipse(centerX + size * 0.2, y + size * 0.18, size * 0.18, size * 0.1, 0.35, 0, Math.PI * 2);
      this.ctx.fill();
    }

    getCellBox(point, cell, paddingRatio) {
      const padding = Math.max(2, cell * paddingRatio);
      return {
        x: point.x * cell + padding,
        y: point.y * cell + padding,
        size: cell - padding * 2,
      };
    }

    drawRoundedSquare(x, y, size, radius, color) {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, size, size, radius);
      this.ctx.fill();
    }
  }

  window.SnakeRenderer = Object.freeze({ Renderer });
}());
