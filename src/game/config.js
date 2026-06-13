(function () {
  const GRID_SIZE = 20;
  const INITIAL_TICK_MS = 150;
  const MIN_TICK_MS = 75;
  const SPEED_STEP = 4;
  const POINTS_PER_FOOD = 10;
  const STORAGE_KEY = 'zzb-snake-best-score';

  const DIRECTIONS = Object.freeze({
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  });


  window.SnakeConfig = Object.freeze({
    GRID_SIZE,
    INITIAL_TICK_MS,
    MIN_TICK_MS,
    SPEED_STEP,
    POINTS_PER_FOOD,
    STORAGE_KEY,
    DIRECTIONS,
  });
}());
