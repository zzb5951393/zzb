(function () {
  const { STORAGE_KEY } = window.SnakeConfig;
  const { bindInput } = window.SnakeInput;
  const { Renderer } = window.SnakeRenderer;
  const { createInitialState, queueDirection, resetGame, stepGame, toggleRunning } = window.SnakeState;

  const canvas = document.querySelector('#game-canvas');
  const scoreEl = document.querySelector('#score');
  const bestScoreEl = document.querySelector('#best-score');
  const statusTextEl = document.querySelector('#status-text');
  const overlayEl = document.querySelector('#overlay');
  const startButton = document.querySelector('#start-button');
  const restartButton = document.querySelector('#restart-button');
  const touchPad = document.querySelector('.touch-pad');

  const renderer = new Renderer(canvas);
  let state = createInitialState();
  let bestScore = Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0;
  let lastFrame = 0;
  let accumulated = 0;

  function updateHud() {
    scoreEl.textContent = state.score.toString();
    bestScoreEl.textContent = bestScore.toString();

    if (state.isGameOver) {
      statusTextEl.textContent = '结束';
      overlayEl.classList.remove('is-hidden');
      overlayEl.querySelector('strong').textContent = '游戏结束';
      overlayEl.querySelector('span').textContent = '点击重新开始，再挑战一次';
      return;
    }

    statusTextEl.textContent = state.isRunning ? '进行中' : '暂停';
    overlayEl.classList.toggle('is-hidden', state.isRunning);
    overlayEl.querySelector('strong').textContent = state.isRunning ? '' : '点击开始';
    overlayEl.querySelector('span').textContent = '方向键 / WASD / 滑动屏幕控制方向';
  }

  function persistBestScore() {
    if (state.score <= bestScore) {
      return;
    }

    bestScore = state.score;
    localStorage.setItem(STORAGE_KEY, bestScore.toString());
  }

  function render() {
    renderer.render(state);
    updateHud();
  }

  function gameLoop(timestamp) {
    const delta = timestamp - lastFrame;
    lastFrame = timestamp;
    accumulated += delta;

    while (accumulated >= state.tickMs) {
      state = stepGame(state);
      persistBestScore();
      accumulated -= state.tickMs;
    }

    render();
    requestAnimationFrame(gameLoop);
  }

  function setDirection(direction) {
    if (state.isGameOver) {
      state = resetGame();
    }
    state = queueDirection(state, direction);
    if (!state.isRunning) {
      state = { ...state, isRunning: true };
    }
    render();
  }

  function toggleGame() {
    state = toggleRunning(state);
    accumulated = 0;
    render();
  }

  function restartGame() {
    state = resetGame();
    accumulated = 0;
    render();
  }

  startButton.addEventListener('click', toggleGame);
  restartButton.addEventListener('click', restartGame);
  overlayEl.addEventListener('click', toggleGame);

  bindInput({
    canvas,
    touchPad,
    onDirection: setDirection,
    onToggle: toggleGame,
  });

  render();
  requestAnimationFrame((timestamp) => {
    lastFrame = timestamp;
    requestAnimationFrame(gameLoop);
  });
}());
