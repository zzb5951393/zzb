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
    { id: 'flame', title: '火焰炮塔', rarity: 'rare', desc: '获得 1 个近中距离扇形燃烧炮塔', type: 'turret', turret: 'flame' },
    { id: 'laser', title: '激光塔', rarity: 'legendary', desc: '获得 1 个短中距离精准激光塔', type: 'turret', turret: 'laser' },
    { id: 'ammo', title: '强化弹药', rarity: 'rare', desc: '所有炮塔伤害 +10%', type: 'mod', key: 'damageBonus', amount: 0.1, max: 1 },
    { id: 'reload', title: '快速装填', rarity: 'rare', desc: '所有炮塔攻速 +10%', type: 'mod', key: 'fireRateBonus', amount: 0.1, max: 0.75 },
    { id: 'range', title: '扩大射程', rarity: 'common', desc: '所有炮塔射程 +10%', type: 'mod', key: 'rangeBonus', amount: 0.1, max: 0.75 },
    { id: 'hp5', title: '厚皮', rarity: 'common', desc: '所有圆球最大血量 +5', type: 'hp', amount: 5 },
    { id: 'shield', title: '护盾模块', rarity: 'rare', desc: '给一个关键圆球安装 60% 减伤护盾', type: 'shield' },
    { id: 'repair', title: '应急修复', rarity: 'common', desc: '所有圆球立即恢复 5 点血', type: 'repair', amount: 5 },
    { id: 'speed', title: '灵巧游动', rarity: 'common', desc: '移动速度 +5%', type: 'mod', key: 'speedBonus', amount: 0.05, max: 0.3 },
    { id: 'regen', title: '快速回能', rarity: 'common', desc: '加速能量恢复 +15%', type: 'mod', key: 'boostRegenBonus', amount: 0.15, max: 0.75 },
    { id: 'magnet', title: '经验磁铁', rarity: 'rare', desc: '经验吸附范围 +5px（最多 8 次）', type: 'magnet', amount: 5, maxStacks: 8 },
    { id: 'xpplus', title: '高效吸收', rarity: 'rare', desc: '获得经验值 +8%', type: 'mod', key: 'xpBonus', amount: 0.08, max: 0.24 },
    { id: 'quick-heal', title: '快速愈合', rarity: 'common', desc: '脱战回血速度 +0.5 HP/s', type: 'mod', key: 'regenBonus', amount: 0.5, max: 2 },
    { id: 'strong-regen', title: '强效再生', rarity: 'rare', desc: '脱战回血速度 +1 HP/s', type: 'mod', key: 'regenBonus', amount: 1, max: 4 },
    { id: 'early-heal', title: '提前愈合', rarity: 'rare', desc: '脱战回血等待 -1 秒（最低 2 秒）', type: 'mod', key: 'regenDelayReduction', amount: 1, max: 3 },
    { id: 'skin-regen', title: '再生外皮', rarity: 'epic', desc: '非燃烧/非毒云时战斗中也缓慢回血', type: 'mod', key: 'combatRegen', amount: 1, max: 1 },
    { id: 'head-repair', title: '头部修复', rarity: 'rare', desc: '头部受损时额外 +2 HP/s', type: 'mod', key: 'headRepairBonus', amount: 2, max: 2 },
    { id: 'life-cycle', title: '生命循环', rarity: 'epic', desc: '离开毒云后尾部回血 +2 HP/s', type: 'mod', key: 'tailRegenBonus', amount: 2, max: 2 },
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
      stats: { enemyXp: 0, enemyKills: 0, enemyLevelUps: 0, bossKills: 0 },
      snakes: [player],
      beans: [],
      chests: [],
      powerups: [],
      bosses: createBosses(),
      poisonZones: createPoisonZones(),
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
      effects: { invincible: 0, giant: 0 },
      poisonTimer: 0,
      inPoison: false,
      headDamaged: false,
      mods: { damageBonus: 0, fireRateBonus: 0, rangeBonus: 0, speedBonus: 0, boostRegenBonus: 0, xpBonus: 0, armorBonus: 0, regenBonus: 0, regenDelayReduction: 0, combatRegen: 0, headRepairBonus: 0, tailRegenBonus: 0, magnetStacks: 0 },
      segments: Array.from({ length: C.INITIAL_SEGMENTS }, createSegment),
      trail: Array.from({ length: 24 }, (_, index) => ({ x: wrap(head.x - Math.cos(angle) * index * C.SEGMENT_SPACING), y: wrap(head.y - Math.sin(angle) * index * C.SEGMENT_SPACING) })),
    };
  }

  function createSegment() {
    return { hp: C.SEGMENT_HP, maxHp: C.SEGMENT_HP, shield: false, turret: null, lastDamageAt: 0, burn: 0, burnTick: 0 };
  }


  function createPoisonZones() {
    return [
      { x: 850, y: 980, radius: 320 },
      { x: 3180, y: 1100, radius: 280 },
      { x: 2200, y: 3180, radius: 360 },
    ];
  }

  function createBosses() {
    return [
      createBoss('boss-1', 760, 3260),
      createBoss('boss-2', 3260, 760),
    ];
  }

  function createBoss(id, x, y) {
    return {
      id,
      x,
      y,
      hp: C.BOSS_CONFIG.hp,
      maxHp: C.BOSS_CONFIG.hp,
      alive: true,
      respawnTimer: 0,
      attackTimer: randomRange(0.2, C.BOSS_CONFIG.attackInterval),
      ringTimer: randomRange(2, C.BOSS_CONFIG.ringInterval),
      spitTimer: randomRange(0.5, C.BOSS_CONFIG.spitInterval),
      angle: 0,
    };
  }

  function stepGame(state, input, dt) {
    state.events = [];
    state.lasers = [];
    if (state.status !== 'playing') return state;
    state.elapsed += dt;
    state.isBoostHeld = Boolean(input.isBoostHeld);
    updatePlayerAim(state, input);
    updateAiSnakes(state, dt);
    updateEffects(state, dt);
    moveSnakes(state, dt);
    updateBeans(state, dt);
    collectBeans(state);
    collectRewards(state);
    updatePoison(state, dt);
    updateBurning(state, dt);
    updateRegeneration(state, dt);
    updateBosses(state, dt);
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


  function updateEffects(state, dt) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      if (snake.effects.invincible > 0) snake.effects.invincible = Math.max(0, snake.effects.invincible - dt);
      if (snake.effects.giant > 0) {
        snake.effects.giant = Math.max(0, snake.effects.giant - dt);
        if (snake.effects.giant === 0) endGiant(snake);
      }
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
      const headPenalty = snake.headDamaged ? C.HEAD_DAMAGED_SPEED_MULTIPLIER : 1;
      const speed = (boosting ? boost : base) * (1 + snake.mods.speedBonus) * headPenalty;
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
    let needed = getNextLevelExp(snake);
    while (snake.xp >= needed) {
      snake.xp -= needed;
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
      needed = getNextLevelExp(snake);
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
    if (card.type === 'magnet' && snake.mods.magnetStacks >= card.maxStacks) return false;
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
    if (card.key === 'regenBonus' || card.key === 'regenDelayReduction' || card.key === 'headRepairBonus') score += snake.headDamaged ? 5 : 1;
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
    if (card.type === 'magnet') {
      snake.magnetRange += card.amount;
      snake.mods.magnetStacks += 1;
    }
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
    if (target.bossId) {
      const boss = state.bosses.find((item) => item.id === target.bossId && item.alive);
      return Boolean(boss) && distance(origin, boss) <= range;
    }
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
    for (const boss of state.bosses) {
      if (!boss.alive) continue;
      const d = distance(origin, boss);
      if (d < range && d < bestDistance) {
        bestDistance = d;
        best = { bossId: boss.id };
      }
    }
    return best;
  }

  function fireTurret(state, owner, origin, turret, def) {
    const bossTarget = turret.target.bossId ? state.bosses.find((boss) => boss.id === turret.target.bossId && boss.alive) : null;
    const targetSnake = turret.target.snakeId ? state.snakes.find((snake) => snake.id === turret.target.snakeId && snake.alive) : null;
    const targetPoint = bossTarget || (targetSnake ? getSnakeSegments(targetSnake)[turret.target.segmentIndex] : null);
    if (!targetPoint) return;
    const damage = def.damage * (1 + owner.mods.damageBonus) * (owner.effects.giant > 0 ? 2 : 1);
    if (def.kind === 'projectile') {
      const angle = angleTo(origin, targetPoint);
      state.projectiles.push({ id: `projectile-${nextProjectileId++}`, ownerId: owner.id, x: origin.x, y: origin.y, vx: Math.cos(angle) * def.projectileSpeed, vy: Math.sin(angle) * def.projectileSpeed, damage, ttl: 1.2, color: def.color });
    } else if (def.kind === 'flame') {
      fireFlameCone(state, owner, origin, targetPoint, def, damage);
    } else {
      if (bossTarget) damageBoss(state, bossTarget, damage, owner);
      else applyDamage(state, targetSnake, turret.target.segmentIndex, damage, owner);
      state.lasers.push({ from: origin, to: targetPoint, color: def.color, ttl: 0.08, kind: def.kind });
    }
    state.events.push({ type: def.kind === 'laser' ? 'laser' : def.kind === 'flame' ? 'flame' : 'shoot', player: owner.isPlayer });
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
      const bossHit = !projectile.boss && findBossProjectileHit(state, projectile);
      if (bossHit) {
        damageBoss(state, bossHit, projectile.damage, owner);
        state.events.push({ type: 'hit', player: owner?.isPlayer });
        state.projectiles.splice(index, 1);
        continue;
      }
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
    if (!segment || !snake.alive || snake.effects.invincible > 0) return;
    const shieldReduction = segment.shield ? 0.6 : 0;
    const armorReduction = clamp(snake.mods.armorBonus, 0, 0.75);
    const damage = rawDamage * (1 - shieldReduction) * (1 - armorReduction);
    if (damage <= 0) return;
    segment.hp = Math.max(0, segment.hp - damage);
    segment.lastDamageAt = state.elapsed;
    state.events.push({ type: segment.shield ? 'shieldHit' : 'hit', player: snake.isPlayer });
    if (segmentIndex === 0) {
      snake.headDamaged = segment.hp <= 0;
      return;
    }
    if (segment.hp > 0) return;
    state.events.push({ type: 'pop', player: snake.isPlayer });
    snake.segments.splice(segmentIndex, 1);
    if (snake.segments.length === 0) killSnake(state, snake, sourceSnake);
    installPendingTurrets(snake);
  }


  function fireFlameCone(state, owner, origin, targetPoint, def, damage) {
    const aim = angleTo(origin, targetPoint);
    const hits = [];
    for (const snake of state.snakes) {
      if (!snake.alive || snake.id === owner.id) continue;
      const points = getSnakeSegments(snake);
      for (let segmentIndex = 0; segmentIndex < points.length; segmentIndex += 1) {
        const point = points[segmentIndex];
        const d = distance(origin, point);
        if (d > def.range) continue;
        const delta = Math.abs(((angleTo(origin, point) - aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (delta <= def.coneAngle / 2) hits.push({ snake, segmentIndex, distance: d });
      }
    }
    hits.sort((a, b) => a.distance - b.distance).slice(0, def.maxHits).forEach((hit) => {
      const segment = hit.snake.segments[hit.segmentIndex];
      if (!segment) return;
      applyDamage(state, hit.snake, hit.segmentIndex, damage, owner);
      segment.burn = Math.max(segment.burn || 0, def.burnDuration);
      segment.burnTick = 0;
    });
    state.lasers.push({ from: origin, to: targetPoint, color: def.color, ttl: 0.12, kind: 'flame' });
  }

  function updateBurning(state, dt) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      for (let index = snake.segments.length - 1; index >= 0; index -= 1) {
        const segment = snake.segments[index];
        if (!segment?.burn) continue;
        segment.burn = Math.max(0, segment.burn - dt);
        segment.burnTick = (segment.burnTick || 0) + dt;
        while (segment.burnTick >= 1 && segment.burn > 0) {
          segment.burnTick -= 1;
          applyDamage(state, snake, index, 1, null);
          if (!snake.segments[index]) break;
        }
      }
    }
  }

  function updateRegeneration(state, dt) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      const delay = Math.max(2, C.REGEN_DELAY_SECONDS - snake.mods.regenDelayReduction);
      for (let index = 0; index < snake.segments.length; index += 1) {
        const segment = snake.segments[index];
        if (!segment || segment.hp >= segment.maxHp || segment.burn > 0 || snake.inPoison) continue;
        const outOfCombat = state.elapsed - (segment.lastDamageAt || 0) >= delay;
        let regen = outOfCombat ? C.BASE_REGEN_PER_SECOND + snake.mods.regenBonus : 0;
        if (!outOfCombat && snake.mods.combatRegen > 0) regen += snake.mods.combatRegen;
        if (index === 0 && snake.headDamaged) regen += snake.mods.headRepairBonus;
        if (index === snake.segments.length - 1) regen += snake.mods.tailRegenBonus;
        if (regen > 0) segment.hp = clamp(segment.hp + regen * dt, 0, segment.maxHp);
      }
      const head = snake.segments[0];
      if (head && snake.headDamaged && head.hp >= head.maxHp * C.HEAD_RECOVERY_RATIO) snake.headDamaged = false;
    }
  }

  function getNextLevelExp(snake) {
    return Math.floor(C.XP_BASE_PER_LEVEL * Math.pow(C.XP_LEVEL_GROWTH, Math.max(0, snake.level - 1)));
  }

  function resolveCollisions(state) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      const head = { x: snake.x, y: snake.y };
      for (const owner of state.snakes) {
        if (!owner.alive || owner.id === snake.id) continue;
        const segments = getSnakeSegments(owner);
        for (let index = 1; index < segments.length; index += 1) {
          if (distance(head, segments[index]) < getSnakeRadius(snake) * 1.45) {
            if (snake.effects.invincible > 0) continue;
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


  function collectRewards(state) {
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      for (let index = state.chests.length - 1; index >= 0; index -= 1) {
        if (distance(snake, state.chests[index]) <= getSnakeRadius(snake) + 18) {
          addXp(state, snake, 50);
          if (Math.random() < 0.45) state.powerups.push(createPowerupNear(state.chests[index].x, state.chests[index].y, Math.random() < 0.5 ? 'invincible' : 'giant'));
          state.chests.splice(index, 1);
          state.events.push({ type: 'chest', player: snake.isPlayer });
        }
      }
      for (let index = state.powerups.length - 1; index >= 0; index -= 1) {
        const powerup = state.powerups[index];
        if (distance(snake, powerup) <= getSnakeRadius(snake) + 16) {
          applyPowerup(snake, powerup.type);
          state.powerups.splice(index, 1);
          state.events.push({ type: 'powerup', player: snake.isPlayer });
        }
      }
    }
  }

  function applyPowerup(snake, type) {
    if (type === 'invincible') snake.effects.invincible = C.POWERUP_TYPES.invincible.duration;
    if (type === 'giant') startGiant(snake);
  }

  function startGiant(snake) {
    if (snake.effects.giant <= 0) {
      for (const segment of snake.segments) {
        segment.maxHp *= 2;
        segment.hp *= 2;
      }
    }
    snake.effects.giant = C.POWERUP_TYPES.giant.duration;
  }

  function endGiant(snake) {
    for (const segment of snake.segments) {
      segment.maxHp = Math.max(C.SEGMENT_HP, segment.maxHp / 2);
      segment.hp = Math.min(segment.hp, segment.maxHp);
    }
  }

  function createPowerupNear(x, y, type) {
    return { id: `powerup-${nextBeanId++}`, x: wrap(x + randomRange(-80, 80)), y: wrap(y + randomRange(-80, 80)), type };
  }

  function updatePoison(state, dt) {
    for (const snake of state.snakes) {
      if (!snake.alive || snake.effects.invincible > 0) {
        snake.inPoison = false;
        continue;
      }
      const inPoison = getSnakeSegments(snake).some((segment) => state.poisonZones.some((zone) => distance(segment, zone) < zone.radius));
      snake.inPoison = inPoison;
      if (!inPoison) {
        snake.poisonTimer = 0;
        continue;
      }
      snake.poisonTimer += dt;
      const tailIndex = snake.segments.length - 1;
      if (tailIndex >= 0) applyDamage(state, snake, tailIndex, C.POISON_DAMAGE_PER_SECOND * dt, null);
      if (snake.poisonTimer > 0.5) {
        state.events.push({ type: 'poison', player: snake.isPlayer });
        snake.poisonTimer = 0;
      }
    }
  }

  function updateBosses(state, dt) {
    for (const boss of state.bosses) {
      if (!boss.alive) {
        boss.respawnTimer -= dt;
        if (boss.respawnTimer <= 0) {
          boss.alive = true;
          boss.hp = boss.maxHp;
        }
        continue;
      }
      const target = findNearestSnake(state, boss, C.BOSS_CONFIG.range);
      if (target) boss.angle = angleTo(boss, target);
      boss.attackTimer -= dt;
      boss.ringTimer -= dt;
      boss.spitTimer -= dt;
      if (target && boss.attackTimer <= 0) {
        fireBossBullet(state, boss, target, C.BOSS_CONFIG.bulletDamage, C.BOSS_CONFIG.bulletSpeed);
        boss.attackTimer = C.BOSS_CONFIG.attackInterval;
      }
      if (boss.ringTimer <= 0) {
        for (let i = 0; i < C.BOSS_CONFIG.ringCount; i += 1) {
          const angle = (Math.PI * 2 * i) / C.BOSS_CONFIG.ringCount;
          fireBossBulletAtAngle(state, boss, angle, C.BOSS_CONFIG.ringDamage, C.BOSS_CONFIG.bulletSpeed * 0.85);
        }
        boss.ringTimer = C.BOSS_CONFIG.ringInterval;
      }
      if (boss.spitTimer <= 0) {
        spitBossXp(state, boss);
        boss.spitTimer = C.BOSS_CONFIG.spitInterval;
      }
    }
  }

  function findNearestSnake(state, point, range) {
    let best = null;
    let bestDistance = range;
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      const d = distance(point, snake);
      if (d < bestDistance) {
        best = snake;
        bestDistance = d;
      }
    }
    return best;
  }

  function fireBossBullet(state, boss, target, damage, speed) {
    fireBossBulletAtAngle(state, boss, angleTo(boss, target), damage, speed);
  }

  function fireBossBulletAtAngle(state, boss, angle, damage, speed) {
    state.projectiles.push({ id: `projectile-${nextProjectileId++}`, boss: true, ownerId: boss.id, x: boss.x, y: boss.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage, ttl: 3, color: '#b245ff' });
    state.events.push({ type: 'bossShoot' });
  }

  function spitBossXp(state, boss) {
    for (let i = 0; i < 8; i += 1) state.beans.push(createBeanNear(boss.x, boss.y, 'xp1', 140));
    for (let i = 0; i < 4; i += 1) state.beans.push(createBeanNear(boss.x, boss.y, 'xp5', 130));
    for (let i = 0; i < 2; i += 1) state.beans.push(createBeanNear(boss.x, boss.y, 'xp10', 120));
    if (Math.random() < 0.5) state.beans.push(createBeanNear(boss.x, boss.y, 'xp20', 120));
    if (Math.random() < 0.1) state.beans.push(createBeanNear(boss.x, boss.y, 'xp50', 120));
  }

  function damageBoss(state, boss, damage, sourceSnake) {
    if (!boss.alive) return;
    boss.hp -= damage;
    state.events.push({ type: 'bossHit', player: sourceSnake?.isPlayer });
    if (boss.hp > 0) return;
    boss.alive = false;
    boss.respawnTimer = C.BOSS_CONFIG.respawnSeconds;
    if (sourceSnake?.isPlayer) state.stats.bossKills += 1;
    dropBossRewards(state, boss);
    state.events.push({ type: 'bossDeath' });
  }

  function dropBossRewards(state, boss) {
    for (let i = 0; i < 30; i += 1) state.beans.push(createBeanNear(boss.x, boss.y, 'xp1', 260));
    for (let i = 0; i < 20; i += 1) state.beans.push(createBeanNear(boss.x, boss.y, 'xp5', 250));
    for (let i = 0; i < 12; i += 1) state.beans.push(createBeanNear(boss.x, boss.y, 'xp10', 230));
    for (let i = 0; i < 8; i += 1) state.beans.push(createBeanNear(boss.x, boss.y, 'xp20', 220));
    for (let i = 0; i < 4; i += 1) state.beans.push(createBeanNear(boss.x, boss.y, 'xp50', 200));
    state.chests.push(createChestNear(boss.x, boss.y), createChestNear(boss.x, boss.y));
    if (Math.random() < 0.1) state.powerups.push(createPowerupNear(boss.x, boss.y, 'invincible'));
    if (Math.random() < 0.1) state.powerups.push(createPowerupNear(boss.x, boss.y, 'giant'));
  }

  function createChestNear(x, y) {
    return { id: `chest-${nextBeanId++}`, x: wrap(x + randomRange(-180, 180)), y: wrap(y + randomRange(-180, 180)) };
  }

  function findBossProjectileHit(state, projectile) {
    return state.bosses.find((boss) => boss.alive && distance(projectile, boss) < 58);
  }

  function getSnakeRadius(snake) {
    return C.SNAKE_RADIUS * (snake.effects.giant > 0 ? 3 : 1);
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
      bossKills: state.stats.bossKills,
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
    getNextLevelExp,
    getSummary,
    resolvePlayerCard,
    shortestDelta,
    stepGame,
    wrap,
  });
}());
