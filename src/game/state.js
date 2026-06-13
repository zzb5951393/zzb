(function () {
  const { DIRECTIONS, GRID_SIZE, INITIAL_TICK_MS, MIN_TICK_MS, POINTS_PER_FOOD, SPEED_STEP } = window.SnakeConfig;

  const clonePoint = (point) => ({ x: point.x, y: point.y });
  const samePoint = (a, b) => a.x === b.x && a.y === b.y;
  const isOpposite = (a, b) => a.x + b.x === 0 && a.y + b.y === 0;

  function createInitialState() {
    const center = Math.floor(GRID_SIZE / 2);

    return {
      snake: [
        { x: center, y: center },
        { x: center - 1, y: center },
        { x: center - 2, y: center },
      ],
      food: { x: center + 4, y: center },
      direction: DIRECTIONS.right,
      nextDirection: DIRECTIONS.right,
      score: 0,
      isRunning: false,
      isGameOver: false,
      tickMs: INITIAL_TICK_MS,
    };
  }

  function queueDirection(state, direction) {
    if (!direction || isOpposite(state.direction, direction)) {
      return state;
    }

    return { ...state, nextDirection: direction };
  }

  function toggleRunning(state) {
    if (state.isGameOver) {
      return createInitialState();
    }

    return { ...state, isRunning: !state.isRunning };
  }

  function resetGame() {
    return { ...createInitialState(), isRunning: true };
  }

  function stepGame(state) {
    if (!state.isRunning || state.isGameOver) {
      return state;
    }

    const direction = state.nextDirection;
    const head = state.snake[0];
    const nextHead = { x: head.x + direction.x, y: head.y + direction.y };

    if (hitsWall(nextHead) || hitsSnake(nextHead, state.snake)) {
      return { ...state, isRunning: false, isGameOver: true };
    }

    const ateFood = samePoint(nextHead, state.food);
    const nextSnake = [nextHead, ...state.snake.map(clonePoint)];

    if (!ateFood) {
      nextSnake.pop();
    }

    const nextScore = ateFood ? state.score + POINTS_PER_FOOD : state.score;

    return {
      ...state,
      snake: nextSnake,
      food: ateFood ? placeFood(nextSnake) : state.food,
      direction,
      score: nextScore,
      tickMs: ateFood ? Math.max(MIN_TICK_MS, state.tickMs - SPEED_STEP) : state.tickMs,
    };
  }

  function hitsWall(point) {
    return point.x < 0 || point.x >= GRID_SIZE || point.y < 0 || point.y >= GRID_SIZE;
  }

  function hitsSnake(point, snake) {
    return snake.some((segment) => samePoint(segment, point));
  }

  function placeFood(snake) {
    const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
    const freeCells = [];

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (!occupied.has(`${x},${y}`)) {
          freeCells.push({ x, y });
        }
      }
    }

    if (freeCells.length === 0) {
      return null;
    }

    return freeCells[Math.floor(Math.random() * freeCells.length)];
  }

  window.SnakeState = Object.freeze({
    createInitialState,
    queueDirection,
    resetGame,
    stepGame,
    toggleRunning,
  });
}());
