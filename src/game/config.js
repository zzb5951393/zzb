(function () {
  const WORLD_SIZE = 4000;
  const TARGET_SNAKE_COUNT = 10;
  const FOOD_TARGET_COUNT = 180;
  const PLAYER_COLOR = '#2f80ff';
  const STORAGE_KEY = 'explorer-snake-best-length';
  const INITIAL_LENGTH = 3;
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
  const WIN_AREA_RATIO = 0.5;

  const VIEWPORT_PRESETS = Object.freeze([
    { label: '自适应屏幕', width: 0, height: 0, adaptive: true },
    { label: '1024 × 1024', width: 1024, height: 1024 },
    { label: '1280 × 720', width: 1280, height: 720 },
    { label: '1920 × 1080', width: 1920, height: 1080 },
    { label: '2048 × 2048', width: 2048, height: 2048 },
  ]);

  const MAP_THEMES = Object.freeze({
    grass: {
      label: '普通草地',
      background: '#a8e46d',
      grid: 'rgba(43, 116, 53, 0.12)',
      decoration: '#7cca50',
    },
    desert: {
      label: '沙漠',
      background: '#e8c06a',
      grid: 'rgba(139, 92, 33, 0.13)',
      decoration: '#d4a653',
    },
  });

  const FOOD_TYPES = Object.freeze({
    normal: { label: '普通果子', radius: 7, color: '#ff6f61', glow: '#ffc0a6', growth: 1, energy: 0, weight: 78, hint: false },
    large: { label: '大果子', radius: 12, color: '#ffbd3d', glow: '#fff0a3', growth: 3, energy: 0, weight: 9, hint: true },
    boost: { label: '加速果子', radius: 10, color: '#58d7ff', glow: '#c8f5ff', growth: 1, energy: 30, weight: 8, hint: true },
    bait: { label: '诱饵果子', radius: 11, color: '#d95cff', glow: '#f4c0ff', growth: 2, energy: 0, weight: 5, hint: true },
  });

  const PERSONALITIES = Object.freeze([
    { key: 'greedy', label: '贪吃型', color: '#ff7a45' },
    { key: 'aggressive', label: '攻击型', color: '#f04770' },
    { key: 'cautious', label: '保守型', color: '#6bdb69' },
    { key: 'wanderer', label: '游荡型', color: '#a56eff' },
  ]);

  window.ExplorerSnakeConfig = Object.freeze({
    AI_BOOST_SPEED,
    AI_SPEED,
    BOOST_DRAIN_PER_SECOND,
    BOOST_MAX_SECONDS,
    BOOST_REGEN_PER_SECOND,
    BOOST_SPEED,
    FOOD_TARGET_COUNT,
    FOOD_TYPES,
    INITIAL_LENGTH,
    MAP_THEMES,
    PERSONALITIES,
    PLAYER_COLOR,
    PLAYER_SPEED,
    SEGMENT_SPACING,
    SNAKE_RADIUS,
    STORAGE_KEY,
    TARGET_SNAKE_COUNT,
    TURN_RATE,
    VIEWPORT_PRESETS,
    WIN_AREA_RATIO,
    WORLD_SIZE,
  });
}());
