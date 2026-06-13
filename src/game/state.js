(function () {
  const C = window.ExplorerSnakeConfig;
  let nextSnakeId = 1;
  let nextFoodId = 1;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomRange = (min, max) => min + Math.random() * (max - min);
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const wrap = (value) => (value + C.WORLD_SIZE) % C.WORLD_SIZE;
  const angleTo = (from, to) => Math.atan2(shortestDelta(to.y, from.y), shortestDelta(to.x, from.x));
  const distance = (a, b) => Math.hypot(shortestDelta(a.x, b.x), shortestDelta(a.y, b.y));
  const shortestDelta = (target, source) => {
    let delta = target - source;
    if (delta > C.WORLD_SIZE / 2) delta -= C.WORLD_SIZE;
    if (delta < -C.WORLD_SIZE / 2) delta += C.WORLD_SIZE;
    return delta;
  };

  function createGame(options = {}) {
    nextSnakeId = 1;
    nextFoodId = 1;
    const theme = options.theme || 'grass';
    const player = createSnake({
      id: 'player',
      name: '探知者',
      color: C.PLAYER_COLOR,
      isPlayer: true,
      x: C.WORLD_SIZE / 2,
      y: C.WORLD_SIZE / 2,
      angle: -Math.PI / 2,
      personality: { key: 'player', label: '玩家' },
    });

    const state = {
      status: 'playing',
      result: null,
      theme,
      elapsed: 0,
      continuedAfterWin: false,
      stats: {
        enemyFruit: 0,
        enemyKills: 0,
      },
      snakes: [player],
      foods: [],
      camera: { x: player.x, y: player.y },
      mouseWorld: { x: player.x + 100, y: player.y },
      isBoostHeld: false,
      victoryLength: calculateVictoryLength(options.viewportWidth || 1280, options.viewportHeight || 720),
    };

    ensureFoodCount(state);
    ensureSnakeCount(state);
    return state;
  }

  function createSnake({ id, name, color, isPlayer = false, x, y, angle, personality }) {
    const head = { x, y };
    return {
      id: id || `ai-${nextSnakeId++}`,
      name,
      color,
      isPlayer,
      personality,
      x,
      y,
      angle,
      targetAngle: angle,
      speed: isPlayer ? C.PLAYER_SPEED : C.AI_SPEED,
      boostEnergy: 100,
      length: C.INITIAL_LENGTH,
      kills: 0,
      fruits: 0,
      alive: true,
      aiTimer: 0,
      aiTarget: null,
      trail: Array.from({ length: 24 }, (_, index) => ({ x: wrap(head.x - Math.cos(angle) * index * C.SEGMENT_SPACING), y: wrap(head.y - Math.sin(angle) * index * C.SEGMENT_SPACING) })),
    };
  }

  function stepGame(state, input, dt) {
    if (state.status !== 'playing') return state;

    state.elapsed += dt;
    state.isBoostHeld = Boolean(input.isBoostHeld);
    updatePlayerAim(state, input);
    updateAiSnakes(state, dt);
    moveSnakes(state, dt);
    collectFood(state);
    resolveCollisions(state);
    removeDeadSnakes(state);
    ensureFoodCount(state);
    ensureSnakeCount(state);
    updateCamera(state, dt);
    checkVictory(state);
    return state;
  }

  function updatePlayerAim(state, input) {
    const player = getPlayer(state);
    if (!player || !player.alive) return;
    const viewport = input.viewport || { width: 1280, height: 720 };
    const screenX = input.pointer.x ?? viewport.width / 2;
    const screenY = input.pointer.y ?? viewport.height / 2;
    const dx = screenX - viewport.width / 2;
    const dy = screenY - viewport.height / 2;
    state.mouseWorld = { x: wrap(player.x + dx), y: wrap(player.y + dy) };
    if (Math.hypot(dx, dy) > 8) {
      player.targetAngle = Math.atan2(dy, dx);
    }
  }

  function updateAiSnakes(state, dt) {
    const player = getPlayer(state);
    for (const snake of state.snakes) {
      if (snake.isPlayer || !snake.alive) continue;
      snake.aiTimer -= dt;
      const danger = findDangerVector(state, snake);
      if (danger) {
        snake.targetAngle = Math.atan2(danger.y, danger.x);
        snake.aiTimer = 0.15;
        continue;
      }
      if (snake.aiTimer <= 0) {
        snake.aiTimer = randomRange(0.25, 0.65);
        snake.aiTarget = chooseAiTarget(state, snake, player);
      }
      if (snake.aiTarget) {
        snake.targetAngle = angleTo(snake, snake.aiTarget);
      } else if (Math.random() < 0.02) {
        snake.targetAngle += randomRange(-0.8, 0.8);
      }
    }
  }

  function chooseAiTarget(state, snake, player) {
    const nearbyFood = state.foods
      .map((food) => ({ food, score: scoreFoodForSnake(state, snake, food) }))
      .sort((a, b) => b.score - a.score)[0]?.food;

    if (snake.personality.key === 'aggressive' && player && player.alive && distance(snake, player) < 650) {
      return Math.random() < 0.55 ? player : nearbyFood;
    }
    if (snake.personality.key === 'wanderer' && Math.random() < 0.25) {
      return { x: wrap(snake.x + randomRange(-500, 500)), y: wrap(snake.y + randomRange(-500, 500)) };
    }
    return nearbyFood;
  }

  function scoreFoodForSnake(state, snake, food) {
    const type = C.FOOD_TYPES[food.type];
    const d = Math.max(1, distance(snake, food));
    const value = type.growth * 120 + type.energy * 2;
    const risk = estimateRisk(state, food, snake);
    const personalityRisk = snake.personality.key === 'cautious' ? 2.2 : snake.personality.key === 'greedy' ? 0.75 : 1;
    return value / d - risk * personalityRisk;
  }

  function estimateRisk(state, point, self) {
    let risk = 0;
    for (const snake of state.snakes) {
      if (snake.id === self.id || !snake.alive) continue;
      const d = distance(point, snake);
      if (d < 240) risk += (240 - d) / 240;
    }
    return risk;
  }

  function findDangerVector(state, snake) {
    const lookAhead = { x: wrap(snake.x + Math.cos(snake.angle) * 90), y: wrap(snake.y + Math.sin(snake.angle) * 90) };
    let avoidX = 0;
    let avoidY = 0;
    for (const other of state.snakes) {
      if (!other.alive) continue;
      const segments = getSnakeSegments(other);
      const start = other.id === snake.id ? 5 : 1;
      for (let index = start; index < segments.length; index += 1) {
        const segment = segments[index];
        const d = distance(lookAhead, segment);
        if (d < C.SNAKE_RADIUS * 3.2) {
          avoidX += shortestDelta(lookAhead.x, segment.x);
          avoidY += shortestDelta(lookAhead.y, segment.y);
        }
      }
    }
    if (avoidX || avoidY) return { x: avoidX, y: avoidY };
    return null;
  }

  function moveSnakes(state, dt) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      const boosting = shouldBoost(state, snake);
      const speed = boosting ? (snake.isPlayer ? C.BOOST_SPEED : C.AI_BOOST_SPEED) : (snake.isPlayer ? C.PLAYER_SPEED : C.AI_SPEED);
      snake.speed = speed;
      snake.angle = turnToward(snake.angle, snake.targetAngle, C.TURN_RATE * dt);
      snake.x = wrap(snake.x + Math.cos(snake.angle) * speed * dt);
      snake.y = wrap(snake.y + Math.sin(snake.angle) * speed * dt);
      snake.trail.unshift({ x: snake.x, y: snake.y });
      const maxTrail = Math.ceil((snake.length + 8) * C.SEGMENT_SPACING / 6);
      snake.trail.length = Math.min(snake.trail.length, maxTrail);

      if (boosting) {
        snake.boostEnergy = clamp(snake.boostEnergy - C.BOOST_DRAIN_PER_SECOND * dt, 0, 100);
      } else {
        snake.boostEnergy = clamp(snake.boostEnergy + C.BOOST_REGEN_PER_SECOND * dt, 0, 100);
      }
    }
  }

  function shouldBoost(state, snake) {
    if (snake.boostEnergy <= 0) return false;
    if (snake.isPlayer) return state.isBoostHeld;
    return snake.personality.key === 'aggressive' && snake.boostEnergy > 35 && Math.random() < 0.03;
  }

  function turnToward(current, target, maxTurn) {
    let delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    delta = clamp(delta, -maxTurn, maxTurn);
    return current + delta;
  }

  function collectFood(state) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      for (let index = state.foods.length - 1; index >= 0; index -= 1) {
        const food = state.foods[index];
        const foodType = C.FOOD_TYPES[food.type];
        if (distance(snake, food) <= C.SNAKE_RADIUS + foodType.radius + 4) {
          snake.length += foodType.growth;
          snake.fruits += 1;
          snake.boostEnergy = clamp(snake.boostEnergy + foodType.energy, 0, 100);
          if (!snake.isPlayer) state.stats.enemyFruit += 1;
          state.foods.splice(index, 1);
        }
      }
    }
  }

  function resolveCollisions(state) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      const head = { x: snake.x, y: snake.y };
      for (const owner of state.snakes) {
        if (!owner.alive) continue;
        const segments = getSnakeSegments(owner);
        const start = owner.id === snake.id ? 5 : 1;
        for (let index = start; index < segments.length; index += 1) {
          if (distance(head, segments[index]) < C.SNAKE_RADIUS * 1.45) {
            snake.alive = false;
            if (owner.id !== snake.id) {
              owner.kills += 1;
              if (!owner.isPlayer) state.stats.enemyKills += 1;
            }
            if (snake.isPlayer) endGame(state, 'defeat');
            break;
          }
        }
        if (!snake.alive) break;
      }
    }
  }

  function removeDeadSnakes(state) {
    for (let index = state.snakes.length - 1; index >= 0; index -= 1) {
      const snake = state.snakes[index];
      if (snake.alive || snake.isPlayer) continue;
      dropFoodFromSnake(state, snake);
      state.snakes.splice(index, 1);
    }
  }

  function dropFoodFromSnake(state, snake) {
    const drops = Math.min(12, Math.floor(snake.length / 2));
    const segments = getSnakeSegments(snake);
    for (let i = 0; i < drops; i += 1) {
      const segment = segments[Math.floor((i / Math.max(1, drops)) * segments.length)] || snake;
      state.foods.push(createFoodNear(segment.x, segment.y, i % 4 === 0 ? 'large' : 'normal'));
    }
  }

  function ensureSnakeCount(state) {
    while (state.snakes.length < C.TARGET_SNAKE_COUNT) {
      state.snakes.push(createAiSnake(state));
    }
  }

  function createAiSnake(state) {
    const personality = pick(C.PERSONALITIES);
    const pos = findSafePosition(state, 500);
    return createSnake({
      name: `${personality.label}-${nextSnakeId}`,
      color: personality.color,
      x: pos.x,
      y: pos.y,
      angle: randomRange(-Math.PI, Math.PI),
      personality,
    });
  }

  function ensureFoodCount(state) {
    while (state.foods.length < C.FOOD_TARGET_COUNT) {
      const type = chooseFoodType();
      const nearDanger = type === 'bait';
      const pos = nearDanger ? findDangerousFoodPosition(state) : findSafePosition(state, 140);
      state.foods.push(createFoodNear(pos.x, pos.y, type));
    }
  }

  function chooseFoodType() {
    const entries = Object.entries(C.FOOD_TYPES);
    const total = entries.reduce((sum, [, type]) => sum + type.weight, 0);
    let roll = Math.random() * total;
    for (const [key, type] of entries) {
      roll -= type.weight;
      if (roll <= 0) return key;
    }
    return 'normal';
  }

  function createFoodNear(x, y, type) {
    return { id: `food-${nextFoodId++}`, x: wrap(x + randomRange(-24, 24)), y: wrap(y + randomRange(-24, 24)), type };
  }

  function findSafePosition(state, minDistance) {
    for (let tries = 0; tries < 120; tries += 1) {
      const pos = { x: randomRange(0, C.WORLD_SIZE), y: randomRange(0, C.WORLD_SIZE) };
      if (isPositionSafe(state, pos, minDistance)) return pos;
    }
    return { x: randomRange(0, C.WORLD_SIZE), y: randomRange(0, C.WORLD_SIZE) };
  }

  function findDangerousFoodPosition(state) {
    const snakes = state.snakes.filter((snake) => snake.alive && !snake.isPlayer);
    if (snakes.length) {
      const snake = pick(snakes);
      const segments = getSnakeSegments(snake);
      const segment = pick(segments.slice(2)) || snake;
      return { x: wrap(segment.x + randomRange(-160, 160)), y: wrap(segment.y + randomRange(-160, 160)) };
    }
    return findSafePosition(state, 120);
  }

  function isPositionSafe(state, pos, minDistance) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      if (distance(pos, snake) < minDistance) return false;
      if (getSnakeSegments(snake).some((segment) => distance(pos, segment) < C.SNAKE_RADIUS * 3)) return false;
    }
    return true;
  }

  function updateCamera(state, dt) {
    const player = getPlayer(state);
    if (!player) return;
    const dx = shortestDelta(player.x, state.camera.x);
    const dy = shortestDelta(player.y, state.camera.y);
    state.camera.x = wrap(state.camera.x + dx * Math.min(1, dt * 8));
    state.camera.y = wrap(state.camera.y + dy * Math.min(1, dt * 8));
  }

  function checkVictory(state) {
    const player = getPlayer(state);
    if (!player || state.continuedAfterWin) return;
    if (player.length >= state.victoryLength) {
      state.status = 'victory';
      state.result = 'victory';
    }
  }

  function continueAfterVictory(state) {
    state.status = 'playing';
    state.continuedAfterWin = true;
  }

  function endGame(state, result = 'ended') {
    state.status = result === 'victory' ? 'victory' : 'ended';
    state.result = result;
  }

  function calculateVictoryLength(width, height) {
    const area = Math.max(1, width * height * C.WIN_AREA_RATIO);
    const segmentArea = Math.PI * C.SNAKE_RADIUS * C.SNAKE_RADIUS;
    return Math.max(35, Math.ceil(area / segmentArea));
  }

  function getSnakeSegments(snake) {
    const segments = [];
    let targetDistance = 0;
    for (let unit = 0; unit < snake.length; unit += 1) {
      const point = sampleTrail(snake.trail, targetDistance);
      if (point) segments.push(point);
      targetDistance += C.SEGMENT_SPACING;
    }
    return segments;
  }

  function sampleTrail(trail, targetDistance) {
    if (!trail.length) return null;
    if (targetDistance <= 0) return trail[0];
    let walked = 0;
    for (let index = 1; index < trail.length; index += 1) {
      const previous = trail[index - 1];
      const current = trail[index];
      const segmentLength = distance(previous, current);
      if (walked + segmentLength >= targetDistance) {
        const ratio = (targetDistance - walked) / Math.max(1, segmentLength);
        return {
          x: wrap(previous.x + shortestDelta(current.x, previous.x) * ratio),
          y: wrap(previous.y + shortestDelta(current.y, previous.y) * ratio),
        };
      }
      walked += segmentLength;
    }
    return trail[trail.length - 1];
  }

  function getPlayer(state) {
    return state.snakes.find((snake) => snake.isPlayer);
  }

  function getSummary(state) {
    const player = getPlayer(state);
    const snakes = state.snakes.slice();
    const topFruit = snakes.sort((a, b) => b.fruits - a.fruits)[0];
    const topKills = state.snakes.slice().sort((a, b) => b.kills - a.kills)[0];
    return {
      result: state.result,
      elapsed: state.elapsed,
      playerLength: player?.length || 0,
      playerKills: player?.kills || 0,
      playerFruit: player?.fruits || 0,
      enemyFruit: state.stats.enemyFruit,
      enemyKills: state.stats.enemyKills,
      topFruitName: topFruit?.name || '无',
      topKillsName: topKills?.name || '无',
    };
  }

  window.ExplorerSnakeState = Object.freeze({
    calculateVictoryLength,
    continueAfterVictory,
    createGame,
    endGame,
    getPlayer,
    getSnakeSegments,
    getSummary,
    shortestDelta,
    stepGame,
    wrap,
  });
}());
