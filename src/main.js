(function () {
  const C = window.ExplorerSnakeConfig;
  const Game = window.ExplorerSnakeState;
  const { createInput } = window.ExplorerSnakeInput;
  const { Renderer } = window.ExplorerSnakeRenderer;

  const menuScreen = document.querySelector('#menu-screen');
  const settingsPanel = document.querySelector('#settings-panel');
  const gameScreen = document.querySelector('#game-screen');
  const canvas = document.querySelector('#game-canvas');
  const viewportSelect = document.querySelector('#viewport-select');
  const themeSelect = document.querySelector('#theme-select');
  const modal = document.querySelector('#modal');
  const modalTitle = document.querySelector('#modal-title');
  const summaryList = document.querySelector('#summary-list');
  const continueButton = document.querySelector('#continue-button');

  const ui = {
    length: document.querySelector('#length-value'),
    kills: document.querySelector('#kills-value'),
    time: document.querySelector('#time-value'),
    boostFill: document.querySelector('#boost-fill'),
  };

  const renderer = new Renderer(canvas);
  const input = createInput(canvas);
  let viewport = getAdaptiveViewport();
  let selectedPreset = C.VIEWPORT_PRESETS[0];
  let game = null;
  let bestLength = Number.parseInt(localStorage.getItem(C.STORAGE_KEY) || '0', 10) || 0;
  let lastFrame = 0;

  C.VIEWPORT_PRESETS.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = preset.label;
    viewportSelect.append(option);
  });

  document.querySelector('#start-game-button').addEventListener('click', startGame);
  document.querySelector('#settings-button').addEventListener('click', () => settingsPanel.classList.remove('is-hidden'));
  document.querySelector('#close-settings-button').addEventListener('click', () => settingsPanel.classList.add('is-hidden'));
  document.querySelector('#apply-settings-button').addEventListener('click', applySettings);
  document.querySelector('#restart-button').addEventListener('click', startGame);
  document.querySelector('#back-menu-button').addEventListener('click', showMenu);
  document.querySelector('#end-run-button').addEventListener('click', () => finishRun('ended'));
  continueButton.addEventListener('click', () => {
    if (!game) return;
    Game.continueAfterVictory(game);
    modal.classList.add('is-hidden');
  });
  window.addEventListener('resize', () => {
    if (!selectedPreset.adaptive) return;
    viewport = getAdaptiveViewport();
    applyViewport();
  });

  applyViewport();
  requestAnimationFrame(loop);

  function applySettings() {
    selectedPreset = C.VIEWPORT_PRESETS[Number(viewportSelect.value)] || C.VIEWPORT_PRESETS[0];
    viewport = selectedPreset.adaptive ? getAdaptiveViewport() : { width: selectedPreset.width, height: selectedPreset.height };
    applyViewport();
    settingsPanel.classList.add('is-hidden');
  }

  function startGame() {
    applySettings();
    game = Game.createGame({ theme: themeSelect.value, viewportWidth: viewport.width, viewportHeight: viewport.height });
    menuScreen.classList.add('is-hidden');
    settingsPanel.classList.add('is-hidden');
    modal.classList.add('is-hidden');
    gameScreen.classList.remove('is-hidden');
    lastFrame = performance.now();
  }

  function showMenu() {
    game = null;
    modal.classList.add('is-hidden');
    gameScreen.classList.add('is-hidden');
    menuScreen.classList.remove('is-hidden');
  }

  function finishRun(result) {
    if (!game) return;
    Game.endGame(game, result);
    showSummary();
  }

  function loop(timestamp) {
    const dt = Math.min(0.05, Math.max(0, (timestamp - lastFrame) / 1000 || 0));
    lastFrame = timestamp;

    if (game && game.status === 'playing') {
      input.viewport = viewport;
      Game.stepGame(game, input, dt);
      updateHud();
      renderer.render(game, viewport);
    } else if (game && game.status === 'victory') {
      updateHud();
      renderer.render(game, viewport);
      showSummary(true);
    } else if (game && game.status === 'ended') {
      showSummary(false);
    }

    requestAnimationFrame(loop);
  }

  function updateHud() {
    const player = Game.getPlayer(game);
    if (!player) return;
    ui.length.textContent = String(player.length);
    ui.kills.textContent = String(player.kills);
    ui.time.textContent = formatTime(game.elapsed);
    ui.boostFill.style.width = `${Math.round(player.boostEnergy)}%`;
  }

  function showSummary(isVictory = false) {
    const summary = Game.getSummary(game);
    const isNewRecord = summary.playerLength > bestLength;
    bestLength = Math.max(bestLength, summary.playerLength);
    localStorage.setItem(C.STORAGE_KEY, String(bestLength));
    modalTitle.textContent = isVictory ? '胜利！已占据半屏' : summary.result === 'defeat' ? '本局失败' : '本局结算';
    continueButton.classList.toggle('is-hidden', !isVictory);
    summaryList.innerHTML = '';
    const rows = [
      ['结果', isVictory ? '胜利' : summary.result === 'defeat' ? '失败' : '主动结束'],
      ['游戏时间', formatTime(summary.elapsed)],
      ['最终长度', summary.playerLength],
      ['历史最高长度', bestLength],
      ['是否新纪录', isNewRecord ? '是' : '否'],
      ['玩家吃果数', summary.playerFruit],
      ['玩家击杀数', summary.playerKills],
      ['敌人总吃果数', summary.enemyFruit],
      ['敌人总击杀数', summary.enemyKills],
      ['吃果最多', summary.topFruitName],
      ['击杀最多', summary.topKillsName],
    ];
    for (const [label, value] of rows) {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      summaryList.append(dt, dd);
    }
    modal.classList.remove('is-hidden');
  }

  function applyViewport() {
    viewport = {
      width: Math.min(viewport.width, window.innerWidth),
      height: Math.min(viewport.height, window.innerHeight),
    };
    renderer.resize(viewport.width, viewport.height);
    input.viewport = viewport;
    input.pointer.x = viewport.width / 2 + 120;
    input.pointer.y = viewport.height / 2;
  }

  function getAdaptiveViewport() {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  function formatTime(seconds) {
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60).toString().padStart(2, '0');
    const secs = (total % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }
}());
