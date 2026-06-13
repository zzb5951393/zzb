(function () {
  const C = window.ExplorerSnakeConfig;
  const S = window.ExplorerSnakeState;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }

    resize(width, height) {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    render(state, viewport) {
      this.drawBackground(state, viewport);
      this.drawFoods(state, viewport);
      this.drawSnakes(state, viewport);
      this.drawEdgeHints(state, viewport);
    }

    worldToScreen(point, state, viewport) {
      return {
        x: viewport.width / 2 + S.shortestDelta(point.x, state.camera.x),
        y: viewport.height / 2 + S.shortestDelta(point.y, state.camera.y),
      };
    }

    drawBackground(state, viewport) {
      const theme = C.MAP_THEMES[state.theme];
      const ctx = this.ctx;
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      const grid = 120;
      const offsetX = -((state.camera.x - viewport.width / 2) % grid);
      const offsetY = -((state.camera.y - viewport.height / 2) % grid);
      for (let x = offsetX; x < viewport.width + grid; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, viewport.height);
        ctx.stroke();
      }
      for (let y = offsetY; y < viewport.height + grid; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(viewport.width, y);
        ctx.stroke();
      }

      ctx.fillStyle = theme.decoration;
      for (let index = 0; index < 90; index += 1) {
        const wx = (index * 317) % C.WORLD_SIZE;
        const wy = (index * 521) % C.WORLD_SIZE;
        const p = this.worldToScreen({ x: wx, y: wy }, state, viewport);
        if (!isVisible(p, 20, viewport)) continue;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 10, 3, index, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    drawFoods(state, viewport) {
      for (const food of state.foods) {
        const type = C.FOOD_TYPES[food.type];
        const p = this.worldToScreen(food, state, viewport);
        if (!isVisible(p, type.radius + 30, viewport)) continue;
        this.ctx.shadowColor = type.glow;
        this.ctx.shadowBlur = type.type === 'bait' ? 18 : 10;
        this.ctx.fillStyle = type.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, type.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = type.glow;
        this.ctx.lineWidth = food.type === 'bait' ? 3 : 1.5;
        this.ctx.stroke();
      }
    }

    drawSnakes(state, viewport) {
      const snakes = state.snakes.slice().sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
      for (const snake of snakes) {
        if (!snake.alive) continue;
        this.drawSnake(state, snake, viewport);
      }
    }

    drawSnake(state, snake, viewport) {
      const segments = S.getSnakeSegments(snake);
      for (let index = segments.length - 1; index >= 0; index -= 1) {
        const segment = segments[index];
        const p = this.worldToScreen(segment, state, viewport);
        if (!isVisible(p, C.SNAKE_RADIUS + 20, viewport)) continue;
        const isHead = index === 0;
        const radius = isHead ? C.SNAKE_RADIUS * 1.22 : C.SNAKE_RADIUS;
        this.ctx.fillStyle = snake.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        if (!snake.isPlayer && !isHead && index % 2 === 0) {
          this.ctx.fillStyle = 'rgba(255,255,255,0.32)';
          this.ctx.beginPath();
          this.ctx.arc(p.x - radius * 0.2, p.y - radius * 0.2, radius * 0.35, 0, Math.PI * 2);
          this.ctx.fill();
        }

        if (isHead) {
          this.drawHeadDetails(p, snake, radius);
        }
      }
    }

    drawHeadDetails(p, snake, radius) {
      const eyeDistance = radius * 0.45;
      const forwardX = Math.cos(snake.angle);
      const forwardY = Math.sin(snake.angle);
      const sideX = Math.cos(snake.angle + Math.PI / 2);
      const sideY = Math.sin(snake.angle + Math.PI / 2);
      const eyeBaseX = p.x + forwardX * radius * 0.3;
      const eyeBaseY = p.y + forwardY * radius * 0.3;

      this.ctx.fillStyle = '#fff';
      for (const side of [-1, 1]) {
        this.ctx.beginPath();
        this.ctx.arc(eyeBaseX + sideX * eyeDistance * side, eyeBaseY + sideY * eyeDistance * side, radius * 0.23, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.fillStyle = '#172033';
      for (const side of [-1, 1]) {
        this.ctx.beginPath();
        this.ctx.arc(eyeBaseX + sideX * eyeDistance * side + forwardX * 2, eyeBaseY + sideY * eyeDistance * side + forwardY * 2, radius * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    drawEdgeHints(state, viewport) {
      const player = S.getPlayer(state);
      if (!player) return;
      const targets = [
        ...state.foods.filter((food) => C.FOOD_TYPES[food.type].hint),
        ...state.snakes.filter((snake) => !snake.isPlayer && snake.alive),
      ];
      const ctx = this.ctx;
      for (const target of targets.slice(0, 20)) {
        const p = this.worldToScreen(target, state, viewport);
        if (isVisible(p, 0, viewport)) continue;
        const angle = Math.atan2(p.y - viewport.height / 2, p.x - viewport.width / 2);
        const x = clamp(viewport.width / 2 + Math.cos(angle) * (viewport.width / 2 - 28), 24, viewport.width - 24);
        const y = clamp(viewport.height / 2 + Math.sin(angle) * (viewport.height / 2 - 28), 24, viewport.height - 24);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = target.type ? C.FOOD_TYPES[target.type].color : 'rgba(255,80,80,0.85)';
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(-8, -8);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function isVisible(point, margin, viewport) {
    return point.x >= -margin && point.x <= viewport.width + margin && point.y >= -margin && point.y <= viewport.height + margin;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.ExplorerSnakeRenderer = Object.freeze({ Renderer });
}());
