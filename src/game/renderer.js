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
      this.drawBossHazards(state, viewport);
      this.drawSpaceHazards(state, viewport);
      this.drawIceZones(state, viewport);
      this.drawChapterTraps(state, viewport);
      this.drawObstacles(state, viewport);
      this.drawBossWarnings(state, viewport);
      this.drawBosses(state, viewport);
      this.drawRewards(state, viewport);
      this.drawBeans(state, viewport);
      this.drawProjectiles(state, viewport);
      this.drawLasers(state, viewport);
      this.drawEffects(state, viewport);
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



    drawBossHazards(state, viewport) {
      for (const zone of state.fireZones || []) {
        const p = this.worldToScreen(zone, state, viewport);
        if (!isVisible(p, zone.radius + 20, viewport)) continue;
        const g = this.ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, zone.radius);
        g.addColorStop(0, 'rgba(255, 205, 64, 0.45)');
        g.addColorStop(0.55, 'rgba(255, 86, 24, 0.28)');
        g.addColorStop(1, 'rgba(255, 30, 0, 0)');
        this.ctx.fillStyle = g;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, zone.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      for (const fog of state.toxicFogs || []) {
        const p = this.worldToScreen(fog, state, viewport);
        if (!isVisible(p, fog.radius + 20, viewport)) continue;
        const g = this.ctx.createRadialGradient(p.x, p.y, fog.radius * 0.15, p.x, p.y, fog.radius);
        g.addColorStop(0, 'rgba(50, 126, 54, 0.55)');
        g.addColorStop(1, 'rgba(35, 92, 45, 0.05)');
        this.ctx.fillStyle = g;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, fog.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    drawSpaceHazards(state, viewport) {
      for (const portal of state.portals || []) {
        const p = this.worldToScreen(portal, state, viewport);
        if (!isVisible(p, portal.radius + 30, viewport)) continue;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(portal.angle || 0);
        const g = this.ctx.createRadialGradient(0, 0, 8, 0, 0, portal.radius);
        g.addColorStop(0, 'rgba(8,10,34,0.95)');
        g.addColorStop(0.45, 'rgba(91,67,255,0.52)');
        g.addColorStop(1, 'rgba(86,218,255,0.08)');
        this.ctx.fillStyle = g;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(172,143,255,0.9)';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, portal.radius, portal.radius * 0.45, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
      for (const hole of state.blackHoles || []) {
        const p = this.worldToScreen(hole, state, viewport);
        if (!isVisible(p, hole.radius + 20, viewport)) continue;
        const g = this.ctx.createRadialGradient(p.x, p.y, hole.coreRadius, p.x, p.y, hole.radius);
        g.addColorStop(0, 'rgba(0,0,0,0.92)');
        g.addColorStop(0.42, 'rgba(89,59,180,0.45)');
        g.addColorStop(1, 'rgba(89,59,180,0)');
        this.ctx.fillStyle = g;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, hole.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      for (const fog of state.starFogs || []) {
        const p = this.worldToScreen(fog, state, viewport);
        if (!isVisible(p, fog.radius + 20, viewport)) continue;
        this.ctx.fillStyle = 'rgba(11, 8, 32, 0.72)';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, fog.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255,255,255,0.45)';
        for (let i = 0; i < 18; i += 1) {
          const a = i * 1.9;
          this.ctx.fillRect(p.x + Math.cos(a) * fog.radius * ((i % 5) / 5), p.y + Math.sin(a) * fog.radius * ((i % 7) / 7), 2, 2);
        }
      }
    }

    drawIceZones(state, viewport) {
      for (const zone of state.iceZones || []) {
        const p = this.worldToScreen(zone, state, viewport);
        if (!isVisible(p, zone.radius + 20, viewport)) continue;
        this.ctx.fillStyle = 'rgba(132, 224, 255, 0.2)';
        this.ctx.strokeStyle = 'rgba(210, 247, 255, 0.55)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, zone.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        for (let i = 0; i < 10; i += 1) {
          const a = i * 0.91;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x + Math.cos(a) * zone.radius * 0.25, p.y + Math.sin(a) * zone.radius * 0.25);
          this.ctx.lineTo(p.x + Math.cos(a) * zone.radius * 0.9, p.y + Math.sin(a) * zone.radius * 0.9);
          this.ctx.stroke();
        }
      }
    }

    drawChapterTraps(state, viewport) {
      for (const spike of state.iceSpikes || []) {
        const p = this.worldToScreen(spike, state, viewport);
        if (!isVisible(p, spike.radius + 20, viewport)) continue;
        this.ctx.fillStyle = '#d9fbff';
        this.ctx.strokeStyle = '#74cfff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y - spike.radius * 1.5);
        this.ctx.lineTo(p.x + spike.radius, p.y + spike.radius);
        this.ctx.lineTo(p.x - spike.radius, p.y + spike.radius);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      }
      for (const tornado of state.iceTornados || []) {
        const p = this.worldToScreen(tornado, state, viewport);
        if (!isVisible(p, tornado.radius + 30, viewport)) continue;
        this.ctx.strokeStyle = 'rgba(197,245,255,0.75)';
        this.ctx.lineWidth = 5;
        for (let i = 0; i < 3; i += 1) {
          this.ctx.beginPath();
          this.ctx.ellipse(p.x, p.y + i * 12 - 12, tornado.radius * (0.75 - i * 0.13), 18 + i * 7, tornado.angle + i, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }
    }

    drawObstacles(state, viewport) {
      for (const obstacle of state.obstacles || []) {
        const p = this.worldToScreen(obstacle, state, viewport);
        if (!isVisible(p, obstacle.radius + 20, viewport)) continue;
        const gradient = this.ctx.createRadialGradient(p.x - obstacle.radius * 0.3, p.y - obstacle.radius * 0.3, 4, p.x, p.y, obstacle.radius);
        if (obstacle.kind === 'ice') {
          gradient.addColorStop(0, '#e2fbff');
          gradient.addColorStop(1, '#75c9df');
        } else if (obstacle.kind === 'stump') {
          gradient.addColorStop(0, '#c68b4a');
          gradient.addColorStop(1, '#6e3f20');
        } else {
          gradient.addColorStop(0, '#b8bdc3');
          gradient.addColorStop(1, '#59616b');
        }
        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.ellipse(p.x, p.y, obstacle.radius * 1.1, obstacle.radius * 0.85, obstacle.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      }
    }

    drawBossWarnings(state, viewport) {
      for (const warning of state.bossWarnings || []) {
        const p = this.worldToScreen(warning, state, viewport);
        if (!isVisible(p, warning.radius + 20, viewport)) continue;
        const progress = warning.timer / warning.duration;
        const pulse = Math.sin(performance.now() / (progress < 0.2 ? 55 : 120)) * 0.18 + 0.34;
        this.ctx.fillStyle = `rgba(255, 37, 37, ${pulse})`;
        this.ctx.strokeStyle = 'rgba(255, 20, 20, 0.95)';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        if (warning.beam) {
          const endX = p.x + Math.cos(warning.angle || 0) * warning.length;
          const endY = p.y + Math.sin(warning.angle || 0) * warning.length;
          this.ctx.lineWidth = warning.width || 40;
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(endX, endY);
          this.ctx.stroke();
        } else {
          this.ctx.arc(p.x, p.y, warning.radius, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
        }
      }
    }

    drawBosses(state, viewport) {
      for (const boss of state.bosses) {
        if (!boss.alive) continue;
        const p = this.worldToScreen(boss, state, viewport);
        if (!isVisible(p, 130, viewport)) continue;
        if (boss.type === 'core') this.drawCoreBoss(p, boss);
        else if (boss.type === 'flame') this.drawFlameBoss(p, boss);
        else if (boss.type === 'viper') this.drawViperBoss(p, boss);
        else if (boss.type === 'iceBreath') this.drawIceBreathBoss(p, boss);
        else if (boss.type === 'iceQueen') this.drawIceQueenBoss(p, boss);
        else if (boss.type === 'iceGod') this.drawIceGodBoss(p, boss);
        else if (boss.type === 'astronaut') this.drawAstronautBoss(p, boss, false);
        else if (boss.type === 'specialAstronaut') this.drawAstronautBoss(p, boss, true);
        else if (boss.type === 'moonLord') this.drawMoonLordBoss(p, boss);
        else this.drawMushroomBoss(p);
        this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
        this.ctx.fillRect(p.x - 62, p.y - 82, 124, 9);
        this.ctx.fillStyle = boss.type === 'iceGod' ? '#e8fbff' : boss.type === 'iceQueen' ? '#88bfff' : boss.type === 'moonLord' ? '#ffd7fa' : boss.type === 'specialAstronaut' ? '#b65cff' : boss.type === 'astronaut' ? '#d9e6ff' : boss.type === 'iceBreath' ? '#9eeaff' : boss.type === 'viper' ? '#6dff79' : boss.type === 'flame' ? '#ff8a42' : boss.type === 'core' ? '#67d8ff' : '#ff5c86';
        this.ctx.fillRect(p.x - 62, p.y - 82, 124 * Math.max(0, boss.hp / boss.maxHp), 9);
      }
    }

    drawMushroomBoss(p) {
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
    }

    drawCoreBoss(p, boss) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(boss.rotation || 0);
      this.ctx.fillStyle = '#4b5564';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 58, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#a9b3c7';
      this.ctx.lineWidth = 8;
      this.ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const a = i * Math.PI / 4;
        this.ctx.fillStyle = '#26313d';
        this.ctx.fillRect(Math.cos(a) * 54 - 6, Math.sin(a) * 54 - 6, 20, 12);
      }
      this.ctx.rotate(-(boss.rotation || 0));
      this.ctx.shadowColor = '#67d8ff';
      this.ctx.shadowBlur = 18;
      this.ctx.fillStyle = '#67d8ff';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      this.ctx.shadowBlur = 0;
    }

    drawFlameBoss(p, boss) {
      this.ctx.shadowColor = '#ff7a22';
      this.ctx.shadowBlur = 18;
      this.ctx.fillStyle = '#ff6b2f';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y - 22, 34, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#d83b21';
      this.ctx.beginPath();
      this.ctx.ellipse(p.x, p.y + 25, 36, 48, boss.angle || 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#ffd36a';
      for (let i = 0; i < 8; i += 1) {
        const a = performance.now() / 220 + i;
        this.ctx.beginPath();
        this.ctx.arc(p.x + Math.cos(a) * 48, p.y + Math.sin(a) * 38, 5, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.shadowBlur = 0;
    }

    drawViperBoss(p, boss) {
      const angle = boss.angle || 0;
      for (let i = 7; i >= 0; i -= 1) {
        const x = p.x - Math.cos(angle) * i * 22;
        const y = p.y - Math.sin(angle) * i * 22;
        this.ctx.fillStyle = i === 0 ? '#2b7d35' : '#235c34';
        this.ctx.beginPath();
        this.ctx.arc(x, y, i === 0 ? 34 : 25, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(185, 88, 255, 0.45)';
        this.ctx.beginPath();
        this.ctx.arc(x - 7, y - 6, 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.fillStyle = '#d6ff6b';
      this.ctx.beginPath();
      this.ctx.arc(p.x + Math.cos(angle + 0.45) * 18, p.y + Math.sin(angle + 0.45) * 18, 5, 0, Math.PI * 2);
      this.ctx.arc(p.x + Math.cos(angle - 0.45) * 18, p.y + Math.sin(angle - 0.45) * 18, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    drawIceBreathBoss(p, boss) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((boss.angle || 0) + Math.PI / 2);
      this.ctx.fillStyle = '#bff7ff';
      this.ctx.strokeStyle = '#5abbe9';
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -78);
      this.ctx.lineTo(24, 22);
      this.ctx.lineTo(0, 58);
      this.ctx.lineTo(-24, 22);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.fillStyle = '#f4feff';
      this.ctx.fillRect(-6, 10, 12, 72);
      this.ctx.restore();
    }

    drawIceQueenBoss(p, boss) {
      this.ctx.shadowColor = '#8bdcff';
      this.ctx.shadowBlur = 16;
      this.ctx.fillStyle = '#5fa8ff';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y - 26, 28, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#2f63b7';
      this.ctx.beginPath();
      this.ctx.ellipse(p.x, p.y + 22, 34, 48, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#dff9ff';
      for (let i = -2; i <= 2; i += 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(p.x + i * 11, p.y - 48);
        this.ctx.lineTo(p.x + i * 11 + 7, p.y - 28);
        this.ctx.lineTo(p.x + i * 11 - 7, p.y - 28);
        this.ctx.fill();
      }
      this.ctx.shadowBlur = 0;
    }

    drawIceGodBoss(p, boss) {
      this.ctx.shadowColor = '#e8fbff';
      this.ctx.shadowBlur = 24;
      this.ctx.fillStyle = 'rgba(232,251,255,0.24)';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 92, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#c5f4ff';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 58, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 6;
      for (let i = 0; i < 6; i += 1) {
        const a = i * Math.PI / 3 + (boss.rotation || 0);
        this.ctx.beginPath();
        this.ctx.moveTo(p.x + Math.cos(a) * 38, p.y + Math.sin(a) * 38);
        this.ctx.lineTo(p.x + Math.cos(a) * 88, p.y + Math.sin(a) * 88);
        this.ctx.stroke();
      }
      this.ctx.shadowBlur = 0;
    }

    drawAstronautBoss(p, boss, special) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(boss.angle || 0);
      this.ctx.fillStyle = special ? '#6b38a8' : '#d9e6ff';
      this.ctx.beginPath();
      this.ctx.arc(0, -24, 30, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#10172e';
      this.ctx.beginPath();
      this.ctx.ellipse(8, -26, 20, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = special ? '#9b5cff' : '#eef5ff';
      this.ctx.fillRect(-22, 8, 44, 58);
      this.ctx.strokeStyle = special ? '#d9a6ff' : '#8db7ff';
      this.ctx.lineWidth = 5;
      this.ctx.strokeRect(-22, 8, 44, 58);
      this.ctx.restore();
    }

    drawMoonLordBoss(p, boss) {
      this.ctx.shadowColor = boss.phase === 2 ? '#ff56d8' : '#ffd7fa';
      this.ctx.shadowBlur = 24;
      this.ctx.fillStyle = 'rgba(255, 245, 210, 0.28)';
      this.ctx.beginPath();
      this.ctx.arc(p.x + 26, p.y - 24, 88, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = boss.phase === 2 ? '#ff74d8' : '#ffd7fa';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y - 32, 26, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = boss.phase === 2 ? '#8a2d8f' : '#8f6bb7';
      this.ctx.beginPath();
      this.ctx.ellipse(p.x, p.y + 22, 42, 58, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 12; i += 1) {
        const a = i * Math.PI / 6 + performance.now() / 1200;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x + Math.cos(a) * 62, p.y + Math.sin(a) * 62);
        this.ctx.lineTo(p.x + Math.cos(a) * 80, p.y + Math.sin(a) * 80);
        this.ctx.stroke();
      }
      this.ctx.shadowBlur = 0;
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
        if (!isVisible(p, 30, viewport)) continue;
        this.ctx.save();
        if (projectile.kind === 'missile') {
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate(projectile.angle || Math.atan2(projectile.vy, projectile.vx));
          this.ctx.fillStyle = projectile.color;
          this.ctx.beginPath();
          this.ctx.moveTo(9, 0);
          this.ctx.lineTo(-7, -5);
          this.ctx.lineTo(-4, 0);
          this.ctx.lineTo(-7, 5);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.fillStyle = 'rgba(255,90,30,0.85)';
          this.ctx.beginPath();
          this.ctx.arc(-10, 0, 4, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (projectile.kind === 'badqMain' || projectile.kind === 'badqShard') {
          this.ctx.fillStyle = projectile.color;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, projectile.kind === 'badqMain' ? 6 : 3, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (projectile.kind === 'heart') {
          this.ctx.fillStyle = '#ff8edb';
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y + 5);
          this.ctx.bezierCurveTo(p.x - 14, p.y - 5, p.x - 4, p.y - 16, p.x, p.y - 6);
          this.ctx.bezierCurveTo(p.x + 4, p.y - 16, p.x + 14, p.y - 5, p.x, p.y + 5);
          this.ctx.fill();
        } else if (projectile.kind === 'sniper') {
          this.ctx.strokeStyle = '#d8fbff';
          this.ctx.lineWidth = 5;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x - Math.cos(projectile.angle || 0) * 13, p.y - Math.sin(projectile.angle || 0) * 13);
          this.ctx.lineTo(p.x + Math.cos(projectile.angle || 0) * 13, p.y + Math.sin(projectile.angle || 0) * 13);
          this.ctx.stroke();
        } else if (projectile.kind === 'iceShard') {
          this.ctx.fillStyle = '#c7f8ff';
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (projectile.kind === 'shotgun') {
          this.ctx.fillStyle = projectile.color;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.strokeStyle = projectile.color;
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x - Math.cos(projectile.angle || 0) * 7, p.y - Math.sin(projectile.angle || 0) * 7);
          this.ctx.lineTo(p.x + Math.cos(projectile.angle || 0) * 7, p.y + Math.sin(projectile.angle || 0) * 7);
          this.ctx.stroke();
        }
        this.ctx.restore();
      }
    }

    drawLasers(state, viewport) {
      for (const laser of state.lasers) {
        const from = this.worldToScreen(laser.from, state, viewport);
        const to = this.worldToScreen(laser.to, state, viewport);
        if (laser.kind === 'flame') {
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const grad = this.ctx.createRadialGradient(from.x, from.y, 8, to.x, to.y, 110);
          grad.addColorStop(0, 'rgba(255,220,80,0.55)');
          grad.addColorStop(0.55, 'rgba(255,92,24,0.34)');
          grad.addColorStop(1, 'rgba(255,40,0,0)');
          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.moveTo(from.x, from.y);
          this.ctx.arc(from.x, from.y, 120, angle - Math.PI / 6, angle + Math.PI / 6);
          this.ctx.closePath();
          this.ctx.fill();
        } else {
          this.ctx.strokeStyle = laser.kind === 'laser' ? hexToRgba(laser.color, 0.28) : 'rgba(255,160,80,0.4)';
          this.ctx.lineWidth = laser.kind === 'laser' ? 11 : 6;
          this.ctx.beginPath();
          this.ctx.moveTo(from.x, from.y);
          this.ctx.lineTo(to.x, to.y);
          this.ctx.stroke();
          this.ctx.strokeStyle = laser.kind === 'laser' ? laser.color : 'rgba(255,220,120,0.9)';
          this.ctx.lineWidth = laser.kind === 'laser' ? 2.5 : 3;
          this.ctx.beginPath();
          this.ctx.moveTo(from.x, from.y);
          this.ctx.lineTo(to.x, to.y);
          this.ctx.stroke();
        }
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
        const baseRadius = C.SNAKE_RADIUS * Math.min(C.SIZE_SCALE_CAP, S.getSizeScale(snake) * (snake.effects.giant > 0 ? 3 : 1));
        const segmentState = snake.segments[index];
        const equipmentScale = segmentState?.turret && segmentState?.shield ? 1.2 : segmentState?.turret ? 1.18 : segmentState?.shield ? 1.15 : 1;
        const radius = (isHead ? baseRadius * 1.22 : baseRadius) * equipmentScale;
        this.ctx.fillStyle = segmentState?.flash > 0 ? '#fff7ef' : snake.color;
        if (snake.chilledTimer > 0) {
          this.ctx.shadowColor = '#b8f3ff';
          this.ctx.shadowBlur = 8;
        }
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
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


    drawEffects(state, viewport) {
      for (const effect of state.effects || []) {
        const p = this.worldToScreen(effect, state, viewport);
        if (!isVisible(p, effect.radius + 30, viewport)) continue;
        const alpha = Math.max(0, effect.ttl / 0.45);
        if (effect.type === 'smoke') {
          this.ctx.fillStyle = effect.color;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, 5 + (1 - alpha) * 10, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (effect.type === 'explosion' || effect.type === 'bossAoe') {
          this.ctx.strokeStyle = hexToRgba(effect.color || '#ff6b2f', Math.max(0.2, alpha));
          this.ctx.lineWidth = effect.type === 'bossAoe' ? 8 : 4;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, effect.radius * (1.15 - alpha * 0.2), 0, Math.PI * 2);
          this.ctx.stroke();
        } else {
          this.ctx.fillStyle = effect.color || '#fff';
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, effect.type === 'sparkBig' ? 11 : 6, 0, Math.PI * 2);
          this.ctx.fill();
        }
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

  function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith('#') || hex.length !== 7) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  window.ExplorerSnakeRenderer = Object.freeze({ Renderer });
}());
