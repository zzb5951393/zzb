export const GRID_SIZE = 20;
export const INITIAL_TICK_MS = 150;
export const MIN_TICK_MS = 75;
export const SPEED_STEP = 4;
export const POINTS_PER_FOOD = 10;
export const STORAGE_KEY = 'zzb-snake-best-score';

export const DIRECTIONS = Object.freeze({
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
});

export const SPRITES = Object.freeze({
  head: { x: 0, y: 0, size: 64 },
  body: { x: 64, y: 0, size: 64 },
  food: { x: 128, y: 0, size: 64 },
});
