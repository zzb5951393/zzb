(function () {
  const C = window.ExplorerSnakeConfig;
  let nextSnakeId = 1;
  let nextBeanId = 1;
  let nextProjectileId = 1;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomRange = (min, max) => min + Math.random() * (max - min);
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const wrap = (value) => (value + C.WORLD_SIZE) % C.WORLD_SIZE;
  const shortestDelta = (target, source) => {
    let delta = target - source;
    if (delta > C.WORLD_SIZE / 2) delta -= C.WORLD_SIZE;
    if (delta < -C.WORLD_SIZE / 2) delta += C.WORLD_SIZE;
    return delta;
  };
  const distance = (a, b) => Math.hypot(shortestDelta(a.x, b.x), shortestDelta(a.y, b.y));
  const angleTo = (from, to) => Math.atan2(shortestDelta(to.y, from.y), shortestDelta(to.x, from.x));

  const CARD_DEFS = Object.freeze([
    { id: 'body1', title: '身体增长 I', rarity: 'common', desc: '身体长度 +1', type: 'body', amount: 1 },
    { id: 'body2', title: '身体增长 II', rarity: 'rare', desc: '身体长度 +2', type: 'body', amount: 2 },
    { id: 'body3', title: '身体增长 III', rarity: 'epic', desc: '身体长度 +3', type: 'body', amount: 3 },
    { id: 'machine', title: '机枪塔', rarity: 'common', desc: '获得 1 个稳定中距离炮塔', type: 'turret', turret: 'machine' },
    { id: 'shotgun', title: '散弹枪塔', rarity: 'rare', desc: '获得 1 个近距离高伤炮塔', type: 'turret', turret: 'shotgun' },
    { id: 'laser', title: '激光塔', rarity: 'legendary', desc: '获得 1 个远程持续激光塔', type: 'turret', turret: 'laser' },
    { id: 'ammo', title: '强化弹药', rarity: 'rare', desc: '所有炮塔伤害 +10%', type: 'mod', key: 'damageBonus', amount: 0.1, max: 1 },
    { id: 'reload', title: '快速装填', rarity: 'rare', desc: '所有炮塔攻速 +10%', type: 'mod', key: 'fireRateBonus', amount: 0.1, max: 0.75 },
    { id: 'range', title: '扩大射程', rarity: 'common', desc: '所有炮塔射程 +10%', type: 'mod', key: 'rangeBonus', amount: 0.1, max: 0.75 },
    { id: 'hp5', title: '厚皮', rarity: 'common', desc: '所有圆球最大血量 +5', type: 'hp', amount: 5 },
    { id: 'shield', title: '护盾模块', rarity: 'rare', desc: '给一个关键圆球安装 60% 减伤护盾', type: 'shield' },
    { id: 'repair', title: '应急修复', rarity: 'common', desc: '所有圆球立即恢复 5 点血', type: 'repair', amount: 5 },
    { id: 'speed', title: '灵巧游动', rarity: 'common', desc: '移动速度 +5%', type: 'mod', key: 'speedBonus', amount: 0.05, max: 0.3 },
    { id: 'regen', title: '快速回能', rarity: 'common', desc: '加速能量恢复 +15%', type: 'mod', key: 'boostRegenBonus', amount: 0.15, max: 0.75 },
    { id: 'magnet', title: '经验磁铁', rarity: 'common', desc: '经验吸附范围 +40px', type: 'magnet', amount: 40 },
    { id: 'xpplus', title: '高效吸收', rarity: 'rare', desc: '获得经验值 +10%', type: 'mod', key: 'xpBonus', amount: 0.1, max: 0.3 },
  ]);

  function createGame(options = {}) {
    nextSnakeId = 1;
    nextBeanId = 1;
    nextProjectileId = 1;
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
      theme: options.theme || 'grass',
      elapsed: 0,
      continuedAfterWin: false,
      stats: { enemyXp: 0, enemyKills: 0, enemyLevelUps: 0 },
      snakes: [player],
      beans: [],
      projectiles: [],
      lasers: [],
      camera: { x: player.x, y: player.y },
      mouseWorld: { x: player.x + 100, y: player.y },
      isBoostHeld: false,
      pendingCards: [],
      pendingSnakeId: null,
      events: [],
      victoryLength: calculateVictoryLength(options.viewportWidth || 1280, options.viewportHeight || 720),
    };
    ensureBeanCounts(state);
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
      boostEnergy: 100,
      level: 1,
      xp: 0,
      totalXp: 0,
      kills: 0,
      alive: true,
      aiTimer: 0,
      aiTarget: null,
      magnetRange: isPlayer ? C.PLAYER_MAGNET_RANGE : C.AI_MAGNET_RANGE,
      pendingTurrets: [],
      mods: { damageBonus: 0, fireRateBonus: 0, rangeBonus: 0, speedBonus: 0, boostRegenBonus: 0, xpBonus: 0, armorBonus: 0 },
      segments: Array.from({ length: C.INITIAL_SEGMENTS }, createSegment),
      trail: Array.from({ length: 24 }, (_, index) => ({ x: wrap(head.x - Math.cos(angle) * index * C.SEGMENT_SPACING), y: wrap(head.y - Math.sin(angle) * index * C.SEGMENT_SPACING) })),
    };
  }

  function createSegment() {
    return { hp: C.SEGMENT_HP, maxHp: C.SEGMENT_HP, shield: false, turret: null };
  }

  function stepGame(state, input, dt) {
    state.events = [];
    state.lasers = [];
    if (state.status !== 'playing') return state;
    state.elapsed += dt;
    state.isBoostHeld = Boolean(input.isBoostHeld);
    updatePlayerAim(state, input);
    updateAiSnakes(state, dt);
    moveSnakes(state, dt);
    updateBeans(state, dt);
    collectBeans(state);
    updateTurrets(state, dt);
    updateProjectiles(state, dt);
    resolveCollisions(state);
    removeDeadSnakes(state);
    ensureBeanCounts(state);
    ensureSnakeCount(state);
    updateCamera(state, dt);
    checkVictory(state);
    return state;
  }

  function updatePlayerAim(state, input) {
    const player = getPlayer(state);
    if (!player?.alive) return;
    const viewport = input.viewport || { width: 1280, height: 720 };
    const dx = (input.pointer.x ?? viewport.width / 2) - viewport.width / 2;
    const dy = (input.pointer.y ?? viewport.height / 2) - viewport.height / 2;
    state.mouseWorld = { x: wrap(player.x + dx), y: wrap(player.y + dy) };
    if (Math.hypot(dx, dy) > 8) player.targetAngle = Math.atan2(dy, dx);
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
      if (snake.aiTarget) snake.targetAngle = angleTo(snake, snake.aiTarget);
      else if (Math.random() < 0.02) snake.targetAngle += randomRange(-0.8, 0.8);
    }
  }

  function chooseAiTarget(state, snake, player) {
    const nearbyBean = state.beans
      .map((bean) => ({ bean, score: scoreBeanForSnake(state, snake, bean) }))
      .sort((a, b) => b.score - a.score)[0]?.bean;
    if (snake.personality.key === 'aggressive' && player?.alive && distance(snake, player) < 700) return Math.random() < 0.4 ? player : nearbyBean;
    if (snake.personality.key === 'wanderer' && Math.random() < 0.22) return { x: wrap(snake.x + randomRange(-520, 520)), y: wrap(snake.y + randomRange(-520, 520)) };
    return nearbyBean;
  }

  function scoreBeanForSnake(state, snake, bean) {
    const type = C.XP_BEAN_TYPES[bean.type];
    const d = Math.max(1, distance(snake, bean));
    const risk = estimateRisk(state, bean, snake) * (snake.personality.key === 'cautious' ? 2.2 : snake.personality.key === 'greedy' ? 0.7 : 1);
    return type.value * 40 / d - risk;
  }

  function estimateRisk(state, point, self) {
    return state.snakes.reduce((risk, snake) => {
      if (snake.id === self.id || !snake.alive) return risk;
      const d = distance(point, snake);
      return d < 260 ? risk + (260 - d) / 260 : risk;
    }, 0);
  }

  function findDangerVector(state, snake) {
    const lookAhead = { x: wrap(snake.x + Math.cos(snake.angle) * 95), y: wrap(snake.y + Math.sin(snake.angle) * 95) };
    let avoidX = 0;
    let avoidY = 0;
    for (const other of state.snakes) {
      if (!other.alive || other.id === snake.id) continue;
      for (const segment of getSnakeSegments(other).slice(1)) {
        const d = distance(lookAhead, segment);
        if (d < C.SNAKE_RADIUS * 3.2) {
          avoidX += shortestDelta(lookAhead.x, segment.x);
          avoidY += shortestDelta(lookAhead.y, segment.y);
        }
      }
    }
    return avoidX || avoidY ? { x: avoidX, y: avoidY } : null;
  }

  function moveSnakes(state, dt) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      const boosting = shouldBoost(state, snake);
      const base = snake.isPlayer ? C.PLAYER_SPEED : C.AI_SPEED;
      const boost = snake.isPlayer ? C.BOOST_SPEED : C.AI_BOOST_SPEED;
      const speed = (boosting ? boost : base) * (1 + snake.mods.speedBonus);
      snake.angle = turnToward(snake.angle, snake.targetAngle, C.TURN_RATE * dt);
      snake.x = wrap(snake.x + Math.cos(snake.angle) * speed * dt);
      snake.y = wrap(snake.y + Math.sin(snake.angle) * speed * dt);
      snake.trail.unshift({ x: snake.x, y: snake.y });
      snake.trail.length = Math.min(snake.trail.length, Math.ceil((snake.segments.length + 10) * C.SEGMENT_SPACING / 5));
      if (boosting) snake.boostEnergy = clamp(snake.boostEnergy - C.BOOST_DRAIN_PER_SECOND * dt, 0, 100);
      else snake.boostEnergy = clamp(snake.boostEnergy + C.BOOST_REGEN_PER_SECOND * (1 + snake.mods.boostRegenBonus) * dt, 0, 100);
    }
  }

  function shouldBoost(state, snake) {
    if (snake.boostEnergy <= 0) return false;
    if (snake.isPlayer) return state.isBoostHeld;
    return snake.personality.key === 'aggressive' && snake.boostEnergy > 35 && Math.random() < 0.03;
  }

  function turnToward(current, target, maxTurn) {
    let delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return current + clamp(delta, -maxTurn, maxTurn);
  }

  function updateBeans(state, dt) {
    for (const bean of state.beans) {
      let nearest = null;
      let nearestDistance = Infinity;
      for (const snake of state.snakes) {
        if (!snake.alive) continue;
        const d = distance(bean, snake);
        if (d < snake.magnetRange && d < nearestDistance) {
          nearest = snake;
          nearestDistance = d;
        }
      }
      if (nearest) {
        const angle = angleTo(bean, nearest);
        bean.x = wrap(bean.x + Math.cos(angle) * C.XP_MAGNET_SPEED * dt);
        bean.y = wrap(bean.y + Math.sin(angle) * C.XP_MAGNET_SPEED * dt);
      }
    }
  }

  function collectBeans(state) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      for (let index = state.beans.length - 1; index >= 0; index -= 1) {
        const bean = state.beans[index];
        const type = C.XP_BEAN_TYPES[bean.type];
        if (distance(snake, bean) <= C.SNAKE_RADIUS + type.radius + 6) {
          addXp(state, snake, type.value);
          state.beans.splice(index, 1);
          state.events.push({ type: 'xp', value: type.value, player: snake.isPlayer });
        }
      }
    }
  }

  function addXp(state, snake, value) {
    const gained = Math.ceil(value * (1 + snake.mods.xpBonus));
    snake.xp += gained;
    snake.totalXp += gained;
    if (!snake.isPlayer) state.stats.enemyXp += gained;
    while (snake.xp >= C.XP_PER_LEVEL) {
      snake.xp -= C.XP_PER_LEVEL;
      snake.level += 1;
      state.events.push({ type: 'level', player: snake.isPlayer });
      if (snake.isPlayer) {
        state.status = 'card-select';
        state.pendingSnakeId = snake.id;
        state.pendingCards = generateCards(snake);
        break;
      }
      applyCard(state, snake, chooseAiCard(snake, generateCards(snake)));
      state.stats.enemyLevelUps += 1;
    }
  }

  function generateCards(snake) {
    const pool = CARD_DEFS.filter((card) => isCardAvailable(snake, card));
    const cards = [];
    while (cards.length < 3 && cards.length < pool.length) {
      const rarity = rollRarity();
      const candidates = pool.filter((card) => card.rarity === rarity && !cards.some((pickedCard) => pickedCard.id === card.id));
      const fallback = pool.filter((card) => !cards.some((pickedCard) => pickedCard.id === card.id));
      cards.push(pick(candidates.length ? candidates : fallback));
    }
    return cards;
  }

  function rollRarity() {
    const entries = Object.entries(C.RARITY_WEIGHTS);
    let roll = Math.random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [rarity, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return rarity;
    }
    return 'common';
  }

  function isCardAvailable(snake, card) {
    if (card.type === 'turret') {
      if (countTurrets(snake) >= C.MAX_TURRETS) return false;
      if (card.turret === 'laser' && hasTurretType(snake, 'laser')) return false;
    }
    if (card.type === 'mod' && card.max !== undefined && snake.mods[card.key] >= card.max) return false;
    return true;
  }

  function chooseAiCard(snake, cards) {
    return cards.slice().sort((a, b) => scoreCardForAi(snake, b) - scoreCardForAi(snake, a))[0];
  }

  function scoreCardForAi(snake, card) {
    let score = Math.random();
    if (card.type === 'turret' && countTurrets(snake) < 3) score += 9;
    if (card.type === 'body' && snake.segments.length < 7) score += 5;
    if (card.type === 'hp' || card.type === 'shield' || card.type === 'repair') score += snake.personality.key === 'cautious' ? 6 : 2;
    if (card.type === 'turret' || card.key === 'damageBonus' || card.key === 'fireRateBonus') score += snake.personality.key === 'aggressive' ? 5 : 1;
    if (card.key === 'xpBonus' || card.key === 'speedBonus' || card.type === 'body') score += snake.personality.key === 'greedy' ? 4 : 1;
    return score;
  }

  function applyCard(state, snake, card) {
    if (!card) return;
    if (card.type === 'body') addSegments(snake, card.amount);
    if (card.type === 'turret') snake.pendingTurrets.push(card.turret);
    if (card.type === 'mod') snake.mods[card.key] = clamp(snake.mods[card.key] + card.amount, 0, card.max ?? 10);
    if (card.type === 'hp') increaseMaxHp(snake, card.amount);
    if (card.type === 'shield') installShield(snake);
    if (card.type === 'repair') repairSnake(snake, card.amount);
    if (card.type === 'magnet') snake.magnetRange += card.amount;
    installPendingTurrets(snake);
    state.events.push({ type: 'card', player: snake.isPlayer });
  }

  function resolvePlayerCard(state, cardId) {
    const snake = state.snakes.find((item) => item.id === state.pendingSnakeId);
    const card = state.pendingCards.find((item) => item.id === cardId);
    if (snake && card) applyCard(state, snake, card);
    state.pendingCards = [];
    state.pendingSnakeId = null;
    state.status = 'playing';
  }

  function addSegments(snake, amount) {
    for (let index = 0; index < amount; index += 1) snake.segments.push(createSegment());
    installPendingTurrets(snake);
  }

  function increaseMaxHp(snake, amount) {
    for (const segment of snake.segments) {
      segment.maxHp += amount;
      segment.hp += amount;
    }
  }

  function repairSnake(snake, amount) {
    for (const segment of snake.segments) segment.hp = clamp(segment.hp + amount, 0, segment.maxHp);
  }

  function installShield(snake) {
    const turretSegment = snake.segments.find((segment) => segment.turret && !segment.shield);
    const target = turretSegment || snake.segments.find((segment) => !segment.shield);
    if (target) target.shield = true;
  }

  function installPendingTurrets(snake) {
    for (let index = 0; index < snake.pendingTurrets.length; index += 1) {
      const type = snake.pendingTurrets[index];
      const slot = C.TURRET_SLOTS.find((slotIndex) => slotIndex < snake.segments.length && !snake.segments[slotIndex].turret);
      if (slot === undefined) continue;
      snake.segments[slot].turret = { type, cooldown: 0, targetTimer: 0 };
      snake.pendingTurrets.splice(index, 1);
      index -= 1;
    }
  }

  function countTurrets(snake) {
    return snake.segments.filter((segment) => segment.turret).length + snake.pendingTurrets.length;
  }

  function hasTurretType(snake, type) {
    return snake.pendingTurrets.includes(type) || snake.segments.some((segment) => segment.turret?.type === type);
  }

  function updateTurrets(state, dt) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      const segments = getSnakeSegments(snake);
      snake.segments.forEach((segment, index) => {
        if (!segment.turret || !segments[index]) return;
        const turret = segment.turret;
        const def = C.TURRET_TYPES[turret.type];
        const range = def.range * (1 + snake.mods.rangeBonus);
        const fireDelay = 1 / (def.fireRate * (1 + snake.mods.fireRateBonus));
        turret.cooldown -= dt;
        turret.targetTimer -= dt;
        if (!turret.target || turret.targetTimer <= 0 || !isTargetValid(state, snake, turret.target, segments[index], range)) {
          turret.target = findTurretTarget(state, snake, segments[index], range);
          turret.targetTimer = C.TURRET_TARGET_INTERVAL;
        }
        if (turret.target && turret.cooldown <= 0) {
          fireTurret(state, snake, segments[index], turret, def);
          turret.cooldown = fireDelay;
        }
      });
    }
  }

  function isTargetValid(state, owner, target, origin, range) {
    const targetSnake = state.snakes.find((snake) => snake.id === target.snakeId && snake.alive);
    if (!targetSnake) return false;
    const targetPoint = getSnakeSegments(targetSnake)[target.segmentIndex];
    return Boolean(targetPoint) && distance(origin, targetPoint) <= range && owner.id !== targetSnake.id;
  }

  function findTurretTarget(state, owner, origin, range) {
    let best = null;
    let bestDistance = Infinity;
    for (const snake of state.snakes) {
      if (!snake.alive || snake.id === owner.id) continue;
      const segments = getSnakeSegments(snake);
      for (let index = 0; index < segments.length; index += 1) {
        const d = distance(origin, segments[index]);
        if (d < range && d < bestDistance) {
          bestDistance = d;
          best = { snakeId: snake.id, segmentIndex: index };
        }
      }
    }
    return best;
  }

  function fireTurret(state, owner, origin, turret, def) {
    const targetSnake = state.snakes.find((snake) => snake.id === turret.target.snakeId && snake.alive);
    if (!targetSnake) return;
    const targetPoint = getSnakeSegments(targetSnake)[turret.target.segmentIndex];
    if (!targetPoint) return;
    const damage = def.damage * (1 + owner.mods.damageBonus);
    if (def.kind === 'projectile') {
      const angle = angleTo(origin, targetPoint);
      state.projectiles.push({ id: `projectile-${nextProjectileId++}`, ownerId: owner.id, x: origin.x, y: origin.y, vx: Math.cos(angle) * def.projectileSpeed, vy: Math.sin(angle) * def.projectileSpeed, damage, ttl: 1.2, color: def.color });
    } else {
      applyDamage(state, targetSnake, turret.target.segmentIndex, damage, owner);
      state.lasers.push({ from: origin, to: targetPoint, color: def.color, ttl: 0.08, kind: def.kind });
    }
    state.events.push({ type: def.kind === 'laser' ? 'laser' : 'shoot', player: owner.isPlayer });
  }

  function updateProjectiles(state, dt) {
    for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = state.projectiles[index];
      projectile.x = wrap(projectile.x + projectile.vx * dt);
      projectile.y = wrap(projectile.y + projectile.vy * dt);
      projectile.ttl -= dt;
      if (projectile.ttl <= 0) {
        state.projectiles.splice(index, 1);
        continue;
      }
      const owner = state.snakes.find((snake) => snake.id === projectile.ownerId);
      const hit = findProjectileHit(state, projectile, owner);
      if (hit) {
        applyDamage(state, hit.snake, hit.segmentIndex, projectile.damage, owner);
        state.events.push({ type: 'hit', player: owner?.isPlayer });
        state.projectiles.splice(index, 1);
      }
    }
  }

  function findProjectileHit(state, projectile, owner) {
    for (const snake of state.snakes) {
      if (!snake.alive || snake.id === owner?.id) continue;
      const segments = getSnakeSegments(snake);
      for (let index = 0; index < segments.length; index += 1) {
        if (distance(projectile, segments[index]) < C.SNAKE_RADIUS + 4) return { snake, segmentIndex: index };
      }
    }
    return null;
  }

  function applyDamage(state, snake, segmentIndex, rawDamage, sourceSnake) {
    const segment = snake.segments[segmentIndex];
    if (!segment || !snake.alive) return;
    const shieldReduction = segment.shield ? 0.6 : 0;
    const armorReduction = clamp(snake.mods.armorBonus, 0, 0.75);
    const damage = rawDamage * (1 - shieldReduction) * (1 - armorReduction);
    segment.hp -= damage;
    if (segment.hp > 0) return;
    state.events.push({ type: 'pop', player: snake.isPlayer });
    snake.segments.splice(segmentIndex, 1);
    if (segmentIndex === 0 || snake.segments.length === 0) killSnake(state, snake, sourceSnake);
    installPendingTurrets(snake);
  }

  function resolveCollisions(state) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      const head = { x: snake.x, y: snake.y };
      for (const owner of state.snakes) {
        if (!owner.alive || owner.id === snake.id) continue;
        const segments = getSnakeSegments(owner);
        for (let index = 1; index < segments.length; index += 1) {
          if (distance(head, segments[index]) < C.SNAKE_RADIUS * 1.45) {
            killSnake(state, snake, owner);
            break;
          }
        }
        if (!snake.alive) break;
      }
    }
  }

  function killSnake(state, snake, killer) {
    if (!snake.alive) return;
    snake.alive = false;
    if (killer && killer.id !== snake.id) {
      killer.kills += 1;
      if (!killer.isPlayer) state.stats.enemyKills += 1;
    }
    dropXpFromSnake(state, snake);
    state.events.push({ type: snake.isPlayer ? 'playerDeath' : 'enemyDeath' });
    if (snake.isPlayer) endGame(state, 'defeat');
  }

  function removeDeadSnakes(state) {
    for (let index = state.snakes.length - 1; index >= 0; index -= 1) {
      const snake = state.snakes[index];
      if (snake.alive || snake.isPlayer) continue;
      state.snakes.splice(index, 1);
    }
  }

  function dropXpFromSnake(state, snake) {
    const total = 30 + snake.level * 10 + snake.segments.length * 3 + countTurrets(snake) * 15 + snake.kills * 20;
    let remaining = total;
    for (const [type, value] of [['xp50', 50], ['xp20', 20], ['xp10', 10], ['xp5', 5], ['xp1', 1]]) {
      while (remaining >= value && Math.random() < 0.75) {
        state.beans.push(createBeanNear(snake.x, snake.y, type, 250));
        remaining -= value;
      }
    }
  }

  function ensureSnakeCount(state) {
    while (state.snakes.length < C.TARGET_SNAKE_COUNT) state.snakes.push(createAiSnake(state));
  }

  function createAiSnake(state) {
    const personality = pick(C.PERSONALITIES);
    const pos = findSafePosition(state, 500);
    return createSnake({ name: `${personality.label}-${nextSnakeId}`, color: personality.color, x: pos.x, y: pos.y, angle: randomRange(-Math.PI, Math.PI), personality });
  }

  function ensureBeanCounts(state) {
    const counts = Object.fromEntries(Object.keys(C.XP_BEAN_TYPES).map((type) => [type, 0]));
    for (const bean of state.beans) counts[bean.type] += 1;
    for (const [type, def] of Object.entries(C.XP_BEAN_TYPES)) {
      while (counts[type] < def.target) {
        const pos = findSafePosition(state, def.value >= 20 ? 180 : 90);
        state.beans.push(createBeanNear(pos.x, pos.y, type, 0));
        counts[type] += 1;
      }
    }
  }

  function createBeanNear(x, y, type, spread) {
    return { id: `bean-${nextBeanId++}`, x: wrap(x + randomRange(-spread, spread)), y: wrap(y + randomRange(-spread, spread)), type };
  }

  function findSafePosition(state, minDistance) {
    for (let tries = 0; tries < 100; tries += 1) {
      const pos = { x: randomRange(0, C.WORLD_SIZE), y: randomRange(0, C.WORLD_SIZE) };
      if (isPositionSafe(state, pos, minDistance)) return pos;
    }
    return { x: randomRange(0, C.WORLD_SIZE), y: randomRange(0, C.WORLD_SIZE) };
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
    state.camera.x = wrap(state.camera.x + shortestDelta(player.x, state.camera.x) * Math.min(1, dt * 8));
    state.camera.y = wrap(state.camera.y + shortestDelta(player.y, state.camera.y) * Math.min(1, dt * 8));
  }

  function checkVictory(state) {
    const player = getPlayer(state);
    if (!player || state.continuedAfterWin) return;
    if (player.segments.length >= state.victoryLength) {
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
    for (let unit = 0; unit < snake.segments.length; unit += 1) {
      const point = sampleTrail(snake.trail, unit * C.SEGMENT_SPACING);
      if (point) segments.push(point);
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
        return { x: wrap(previous.x + shortestDelta(current.x, previous.x) * ratio), y: wrap(previous.y + shortestDelta(current.y, previous.y) * ratio) };
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
    const topXp = state.snakes.slice().sort((a, b) => b.totalXp - a.totalXp)[0];
    const topKills = state.snakes.slice().sort((a, b) => b.kills - a.kills)[0];
    return {
      result: state.result,
      elapsed: state.elapsed,
      playerLevel: player?.level || 0,
      playerLength: player?.segments.length || 0,
      playerTurrets: player ? countTurrets(player) : 0,
      playerKills: player?.kills || 0,
      playerXp: player?.totalXp || 0,
      enemyXp: state.stats.enemyXp,
      enemyKills: state.stats.enemyKills,
      topXpName: topXp?.name || '无',
      topKillsName: topKills?.name || '无',
    };
  }

  window.ExplorerSnakeState = Object.freeze({
    CARD_DEFS,
    calculateVictoryLength,
    continueAfterVictory,
    countTurrets,
    createGame,
    endGame,
    getPlayer,
    getSnakeSegments,
    getSummary,
    resolvePlayerCard,
    shortestDelta,
    stepGame,
    wrap,
  });
}());
