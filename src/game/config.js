(function () {
  const WORLD_SIZE = 4000;
  const TARGET_SNAKE_COUNT = 10;
  const PLAYER_COLOR = '#2f80ff';
  const STORAGE_KEY = 'explorer-snake-rogue-records';
  const INITIAL_SEGMENTS = 3;
  const SEGMENT_HP = 30;
  const SEGMENT_SPACING = 18;
  const SNAKE_RADIUS = 12;
  const PLAYER_SPEED = 300;
  const BOOST_SPEED = 520;
  const AI_SPEED = 245;
  const AI_BOOST_SPEED = 360;
  const TURN_RATE = 8.5;
  const BOOST_MAX_SECONDS = 5;
  const BOOST_DRAIN_PER_SECOND = 100 / BOOST_MAX_SECONDS;
  const BOOST_REGEN_PER_SECOND = 10;
  const XP_BASE_PER_LEVEL = 100;
  const XP_LEVEL_GROWTH = 1.2;
  const PLAYER_MAGNET_RANGE = 60;
  const AI_MAGNET_RANGE = 45;
  const XP_MAGNET_SPEED = 350;
  const REGEN_DELAY_SECONDS = 5;
  const BASE_REGEN_PER_SECOND = 1;
  const HEAD_DAMAGED_SPEED_MULTIPLIER = 0.7;
  const HEAD_RECOVERY_RATIO = 0.3;
  const MAX_TURRETS = 10;
  const TURRET_TARGET_INTERVAL = 0.2;
  const WIN_AREA_RATIO = 0.5;
  const POISON_DAMAGE_PER_SECOND = 6;
  const POISON_ZONE_COUNT = 3;
  const SIZE_SCALE_CAP = 20;
  const BOSS_AOE_WARNING_SECONDS = 2.5;
  const BOSS_AOE_RADIUS = 220;
  const BOSS_AOE_INTERVAL = 8;
  const BOSS_AOE_DAMAGE_RATIO = 0.5;
  const ICE_SLOW_MULTIPLIER = 0.6;
  const ICE_LINGER_SECONDS = 3;

  const VIEWPORT_PRESETS = Object.freeze([
    { label: '自适应屏幕', width: 0, height: 0, adaptive: true },
    { label: '1024 × 1024', width: 1024, height: 1024 },
    { label: '1280 × 720', width: 1280, height: 720 },
    { label: '1920 × 1080', width: 1920, height: 1080 },
    { label: '2048 × 2048', width: 2048, height: 2048 },
  ]);

  const MAP_THEMES = Object.freeze({
    grass: { label: '普通草地', background: '#a8e46d', grid: 'rgba(43, 116, 53, 0.12)', decoration: '#7cca50' },
    desert: { label: '沙漠', background: '#e8c06a', grid: 'rgba(139, 92, 33, 0.13)', decoration: '#d4a653' },
    ice: { label: '冰雪之地', background: '#d8f6ff', grid: 'rgba(61, 139, 181, 0.16)', decoration: '#9adfff' },
    space: { label: '宇航世界', background: '#070b24', grid: 'rgba(124, 110, 255, 0.22)', decoration: '#f8fbff' },
  });

  const XP_BEAN_TYPES = Object.freeze({
    xp1: { label: '小经验豆', value: 1, radius: 3, color: '#d6ff6b', glow: '#f4ffc2', target: 650, weight: 72 },
    xp5: { label: '普通经验豆', value: 5, radius: 5, color: '#75f06d', glow: '#cbffc7', target: 130, weight: 20 },
    xp10: { label: '中型经验豆', value: 10, radius: 7, color: '#56d6ff', glow: '#c9f5ff', target: 45, weight: 6 },
    xp20: { label: '大型经验豆', value: 20, radius: 9, color: '#ffb23d', glow: '#ffe3a3', target: 14, weight: 1.7 },
    xp50: { label: '超级经验豆', value: 50, radius: 12, color: '#e76cff', glow: '#f8ccff', target: 3, weight: 0.3 },
  });

  const PERSONALITIES = Object.freeze([
    { key: 'greedy', label: '贪吃型', color: '#ff7a45' },
    { key: 'aggressive', label: '攻击型', color: '#f04770' },
    { key: 'cautious', label: '保守型', color: '#6bdb69' },
    { key: 'wanderer', label: '游荡型', color: '#a56eff' },
  ]);


  const POWERUP_TYPES = Object.freeze({
    invincible: { label: '无敌', duration: 10, color: '#ffd85c' },
    giant: { label: '巨大化', duration: 15, color: '#ff7a45' },
  });

  const BOSS_CONFIG = Object.freeze({
    count: 2,
    hp: 1500,
    range: 900,
    bulletSpeed: 400,
    bulletDamage: 6,
    attackInterval: 1.2,
    ringInterval: 8,
    ringCount: 12,
    ringDamage: 4,
    aoeWarningSeconds: BOSS_AOE_WARNING_SECONDS,
    aoeRadius: BOSS_AOE_RADIUS,
    aoeInterval: BOSS_AOE_INTERVAL,
    aoeDamageRatio: BOSS_AOE_DAMAGE_RATIO,
    spitInterval: 2.5,
    respawnSeconds: 120,
  });

  const TURRET_TYPES = Object.freeze({
    machine: { label: '机枪塔', rarity: 'common', range: 500, fireRate: 2, damage: 3, color: '#ffe36e', kind: 'projectile', projectileSpeed: 760 },
    shotgun: { label: '散弹枪塔', rarity: 'rare', range: 220, fireRate: 1, damage: 3, color: '#ff9a55', kind: 'shotgun', projectileSpeed: 620, pellets: 3, spread: Math.PI / 6 },
    flame: { label: '火焰炮塔', rarity: 'rare', range: 300, fireRate: 1, damage: 2, color: '#ff6b2f', kind: 'flame', coneAngle: Math.PI / 3, maxHits: 6, burnDuration: 5, burnDps: 1 },
    laser: { label: '激光塔', rarity: 'legendary', range: 350, fireRate: 4, damage: 1.8, color: '#ff5cf4', kind: 'laser', unique: true },
    missile: { label: '导弹塔', rarity: 'epic', range: 650, fireRate: 0.4, damage: 8, splashDamage: 4, explosionRadius: 80, color: '#ffcf5c', kind: 'missile', projectileSpeed: 180, turnRate: 2.1, ttl: 4 },
    sniper: { label: '狙击枪', rarity: 'epic', range: 1300, fireRate: 0.2, damage: 200, color: '#b7f3ff', kind: 'sniper', projectileSpeed: 1200 },
    badq: { label: '霸带枪', rarity: 'epic', range: 500, fireRate: 1 / 3, damage: 1, color: '#d56cff', kind: 'badq', projectileSpeed: 300, splitAfter: 2, splitCount: 5 },
  });

  const RARITY_WEIGHTS = Object.freeze({ common: 60, rare: 25, epic: 12, legendary: 3 });
  const RARITY_LABELS = Object.freeze({ common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' });

  const TURRET_SLOTS = Object.freeze([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);

  window.ExplorerSnakeConfig = Object.freeze({
    AI_BOOST_SPEED,
    AI_MAGNET_RANGE,
    AI_SPEED,
    BASE_REGEN_PER_SECOND,
    BOOST_DRAIN_PER_SECOND,
    BOOST_MAX_SECONDS,
    BOOST_REGEN_PER_SECOND,
    BOSS_CONFIG,
    BOSS_AOE_DAMAGE_RATIO,
    BOSS_AOE_INTERVAL,
    BOSS_AOE_RADIUS,
    BOSS_AOE_WARNING_SECONDS,
    BOOST_SPEED,
    HEAD_DAMAGED_SPEED_MULTIPLIER,
    HEAD_RECOVERY_RATIO,
    ICE_LINGER_SECONDS,
    ICE_SLOW_MULTIPLIER,
    INITIAL_SEGMENTS,
    MAP_THEMES,
    MAX_TURRETS,
    PERSONALITIES,
    POISON_DAMAGE_PER_SECOND,
    POISON_ZONE_COUNT,
    POWERUP_TYPES,
    PLAYER_COLOR,
    PLAYER_MAGNET_RANGE,
    PLAYER_SPEED,
    RARITY_LABELS,
    RARITY_WEIGHTS,
    REGEN_DELAY_SECONDS,
    SEGMENT_HP,
    SEGMENT_SPACING,
    SIZE_SCALE_CAP,
    SNAKE_RADIUS,
    STORAGE_KEY,
    TARGET_SNAKE_COUNT,
    TURRET_SLOTS,
    TURRET_TARGET_INTERVAL,
    TURRET_TYPES,
    TURN_RATE,
    VIEWPORT_PRESETS,
    WIN_AREA_RATIO,
    WORLD_SIZE,
    XP_BEAN_TYPES,
    XP_BASE_PER_LEVEL,
    XP_LEVEL_GROWTH,
    XP_MAGNET_SPEED,
  });
}());
