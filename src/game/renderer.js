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
      this.drawPoisonZones(state, viewport);
      this.drawBosses(state, viewport);
      this.drawRewards(state, viewport);
      this.drawBeans(state, viewport);
      this.drawProjectiles(state, viewport);
      this.drawLasers(state, viewport);
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


    drawPoisonZones(state, viewport) {
      for (const zone of state.poisonZones) {
        const p = this.worldToScreen(zone, state, viewport);
        if (!isVisible(p, zone.radius + 40, viewport)) continue;
        const gradient = this.ctx.createRadialGradient(p.x, p.y, zone.radius * 0.25, p.x, p.y, zone.radius);
        gradient.addColorStop(0, 'rgba(65, 26, 78, 0.48)');
        gradient.addColorStop(0.65, 'rgba(55, 18, 68, 0.28)');
        gradient.addColorStop(1, 'rgba(55, 18, 68, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, zone.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    drawBosses(state, viewport) {
      for (const boss of state.bosses) {
        if (!boss.alive) continue;
        const p = this.worldToScreen(boss, state, viewport);
        if (!isVisible(p, 110, viewport)) continue;
        this.ctx.fillStyle = 'rgba(88, 24, 112, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 88, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#7b3f2f';
        this.ctx.beginPath();
        this.ctx.ellipse(p.x, p.y + 30, 24, 42, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#c84b73';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 54, Math.PI, Math.PI * 2);
        this.ctx.quadraticCurveTo(p.x + 62, p.y + 22, p.x, p.y + 30);
        this.ctx.quadraticCurveTo(p.x - 62, p.y + 22, p.x - 54, p.y);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffd7e2';
        for (let i = 0; i < 7; i += 1) {
          const angle = i * 1.7;
          this.ctx.beginPath();
          this.ctx.arc(p.x + Math.cos(angle) * 28, p.y - 8 + Math.sin(angle) * 14, 6, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
        this.ctx.fillRect(p.x - 55, p.y - 78, 110, 8);
        this.ctx.fillStyle = '#ff5c86';
        this.ctx.fillRect(p.x - 55, p.y - 78, 110 * Math.max(0, boss.hp / boss.maxHp), 8);
      }
    }

    drawRewards(state, viewport) {
      for (const chest of state.chests) {
        const p = this.worldToScreen(chest, state, viewport);
        if (!isVisible(p, 24, viewport)) continue;
        this.ctx.fillStyle = '#8d5a2b';
        this.ctx.fillRect(p.x - 12, p.y - 9, 24, 18);
        this.ctx.fillStyle = '#ffd45c';
        this.ctx.fillRect(p.x - 12, p.y - 2, 24, 4);
      }
      for (const powerup of state.powerups) {
        const type = C.POWERUP_TYPES[powerup.type];
        const p = this.worldToScreen(powerup, state, viewport);
        if (!isVisible(p, 30, viewport)) continue;
        this.ctx.shadowColor = type.color;
        this.ctx.shadowBlur = 18;
        this.ctx.fillStyle = type.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }

    drawBeans(state, viewport) {
      for (const bean of state.beans) {
        const type = C.XP_BEAN_TYPES[bean.type];
        const p = this.worldToScreen(bean, state, viewport);
        if (!isVisible(p, type.radius + 30, viewport)) continue;
        this.ctx.shadowColor = type.glow;
        this.ctx.shadowBlur = type.value >= 20 ? 16 : 8;
        this.ctx.fillStyle = type.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, type.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = type.glow;
        this.ctx.lineWidth = type.value >= 20 ? 2.5 : 1.4;
        this.ctx.stroke();
      }
    }

    drawProjectiles(state, viewport) {
      for (const projectile of state.projectiles) {
        const p = this.worldToScreen(projectile, state, viewport);
        if (!isVisible(p, 20, viewport)) continue;
        this.ctx.fillStyle = projectile.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    drawLasers(state, viewport) {
      for (const laser of state.lasers) {
        const from = this.worldToScreen(laser.from, state, viewport);
        const to = this.worldToScreen(laser.to, state, viewport);
        this.ctx.strokeStyle = laser.kind === 'laser' ? 'rgba(255,92,244,0.8)' : 'rgba(255,160,80,0.75)';
        this.ctx.lineWidth = laser.kind === 'laser' ? 3 : 5;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
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
        const baseRadius = C.SNAKE_RADIUS * (snake.effects.giant > 0 ? 3 : 1);
        const segmentState = snake.segments[index];
        const equipmentScale = segmentState?.turret && segmentState?.shield ? 1.2 : segmentState?.turret ? 1.18 : segmentState?.shield ? 1.15 : 1;
        const radius = (isHead ? baseRadius * 1.22 : baseRadius) * equipmentScale;
        this.ctx.fillStyle = snake.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        if (segmentState?.shield) this.drawShield(p, radius);
        if (segmentState) this.drawHpRing(p, radius, segmentState.hp / segmentState.maxHp, snake.isPlayer || isNearPlayer(state, snake));
        if (segmentState?.burn > 0) this.drawBurning(p, radius);
        if (segmentState?.turret) this.drawTurret(p, snake, radius, segmentState.turret.type);
        if (snake.headDamaged && isHead) this.drawHeadDamaged(p, radius);
        if (snake.effects.invincible > 0) this.drawInvincibleAura(p, radius);

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



    drawInvincibleAura(p, radius) {
      this.ctx.strokeStyle = 'rgba(255, 220, 70, 0.9)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius + 7, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    drawTurret(p, snake, radius, type) {
      const def = C.TURRET_TYPES[type];
      const angle = snake.angle;
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(angle);
      this.ctx.fillStyle = def.color;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      if (type === 'laser') {
        this.ctx.arc(radius * 0.18, 0, radius * 0.32, 0, Math.PI * 2);
      } else if (type === 'flame') {
        this.ctx.moveTo(-radius * 0.25, -radius * 0.34);
        this.ctx.lineTo(radius * 0.9, 0);
        this.ctx.lineTo(-radius * 0.25, radius * 0.34);
        this.ctx.closePath();
      } else {
        this.ctx.roundRect(-radius * 0.25, -radius * 0.25, radius * 0.9, radius * 0.5, 4);
      }
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }

    drawShield(p, radius) {
      this.ctx.strokeStyle = 'rgba(98, 226, 255, 0.9)';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius + 7, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.strokeStyle = 'rgba(210, 250, 255, 0.35)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius + 11, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    drawHpRing(p, radius, ratio, alwaysShow) {
      if (!alwaysShow && ratio >= 0.98) return;
      const color = ratio > 0.55 ? 'rgba(83,255,111,0.9)' : ratio > 0.3 ? 'rgba(255,220,77,0.95)' : 'rgba(255,67,67,0.98)';
      this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      this.ctx.lineWidth = 3.5;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, ratio));
      this.ctx.stroke();
    }

    drawBurning(p, radius) {
      this.ctx.strokeStyle = 'rgba(255, 94, 36, 0.95)';
      this.ctx.lineWidth = 2.5;
      this.ctx.setLineDash([3, 4]);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius + 9, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    drawHeadDamaged(p, radius) {
      this.ctx.strokeStyle = 'rgba(255, 55, 55, 0.95)';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius + 12, -Math.PI * 0.2, Math.PI * 1.25);
      this.ctx.stroke();
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
        ...state.beans.filter((bean) => C.XP_BEAN_TYPES[bean.type].value >= 20),
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
        ctx.fillStyle = target.type ? C.XP_BEAN_TYPES[target.type].color : 'rgba(255,80,80,0.85)';
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

  function isNearPlayer(state, snake) {
    const player = S.getPlayer(state);
    if (!player || snake.isPlayer) return true;
    return Math.hypot(S.shortestDelta(snake.x, player.x), S.shortestDelta(snake.y, player.y)) < 620;
  }

  function isVisible(point, margin, viewport) {
    return point.x >= -margin && point.x <= viewport.width + margin && point.y >= -margin && point.y <= viewport.height + margin;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.ExplorerSnakeRenderer = Object.freeze({ Renderer });
}());
