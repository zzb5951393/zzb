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
  const cardModal = document.querySelector('#card-modal');
  const cardOptions = document.querySelector('#card-options');
  const modalTitle = document.querySelector('#modal-title');
  const summaryList = document.querySelector('#summary-list');
  const continueButton = document.querySelector('#continue-button');
  const soundToggle = document.querySelector('#sound-toggle');
  const volumeRange = document.querySelector('#volume-range');

  const ui = {
    level: document.querySelector('#level-value'),
    xpFill: document.querySelector('#xp-fill'),
    length: document.querySelector('#length-value'),
    turrets: document.querySelector('#turrets-value'),
    kills: document.querySelector('#kills-value'),
    time: document.querySelector('#time-value'),
    boostFill: document.querySelector('#boost-fill'),
    status: document.querySelector('#status-value'),
    bossFill: document.querySelector('#boss-fill'),
  };

  const renderer = new Renderer(canvas);
  const input = createInput(canvas);
  let viewport = getAdaptiveViewport();
  let selectedPreset = C.VIEWPORT_PRESETS[0];
  let game = null;
  let bestLength = Number.parseInt(localStorage.getItem(C.STORAGE_KEY) || '0', 10) || 0;
  let lastFrame = 0;
  let audioContext = null;

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
    cardModal.classList.add('is-hidden');
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
      playEvents(game.events);
      updateHud();
      renderer.render(game, viewport);
    } else if (game && game.status === 'card-select') {
      updateHud();
      renderer.render(game, viewport);
      showCards();
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
    ui.level.textContent = String(player.level);
    const nextLevelExp = Game.getNextLevelExp(player);
    ui.xpFill.style.width = `${Math.round((player.xp / nextLevelExp) * 100)}%`;
    ui.level.title = `下一级需要 ${nextLevelExp} 经验`;
    ui.length.textContent = String(player.segments.length);
    ui.turrets.textContent = `${Game.countTurrets(player)}/${C.MAX_TURRETS}`;
    ui.kills.textContent = String(player.kills);
    ui.time.textContent = formatTime(game.elapsed);
    ui.boostFill.style.width = `${Math.round(player.boostEnergy)}%`;
    ui.status.textContent = player.effects.invincible > 0 ? '无敌' : player.effects.giant > 0 ? '巨大化' : player.headDamaged ? '头部受损' : '普通';
    const nearestBoss = game.bosses.filter((boss) => boss.alive).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
    ui.bossFill.style.width = nearestBoss ? `${Math.round((nearestBoss.hp / nearestBoss.maxHp) * 100)}%` : '0%';
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
      ['最终等级', summary.playerLevel],
      ['最终长度', summary.playerLength],
      ['最终炮塔', summary.playerTurrets],
      ['历史最高长度', bestLength],
      ['是否新纪录', isNewRecord ? '是' : '否'],
      ['玩家总经验', summary.playerXp],
      ['玩家击杀数', summary.playerKills],
      ['Boss 击杀数', summary.bossKills],
      ['敌人总经验', summary.enemyXp],
      ['敌人总击杀数', summary.enemyKills],
      ['经验最多', summary.topXpName],
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


  function showCards() {
    if (!game || !game.pendingCards.length || !cardModal.classList.contains('is-hidden')) return;
    playTone(740, 0.14, 'sine');
    cardOptions.innerHTML = '';
    for (const card of game.pendingCards) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card-button';
      button.innerHTML = `<span class="card-rarity ${card.rarity}">${C.RARITY_LABELS[card.rarity]}</span><strong>${card.title}</strong><p>${card.desc}</p>`;
      button.addEventListener('click', () => {
        Game.resolvePlayerCard(game, card.id);
        cardModal.classList.add('is-hidden');
        playTone(920, 0.12, 'triangle');
      });
      cardOptions.append(button);
    }
    cardModal.classList.remove('is-hidden');
  }

  function playEvents(events = []) {
    for (const event of events) {
      if (event.type === 'xp' && event.player) playTone(260 + event.value * 16, 0.035, 'sine');
      if (event.type === 'level' && event.player) playTone(720, 0.12, 'triangle');
      if (event.type === 'shoot' && event.player) playTone(180, 0.025, 'square');
      if (event.type === 'flame' && event.player) playTone(260, 0.06, 'sawtooth');
      if (event.type === 'laser' && event.player) playTone(520, 0.045, 'sawtooth');
      if (event.type === 'hit') playTone(120, 0.025, 'sine');
      if (event.type === 'pop') playTone(90, 0.08, 'triangle');
      if (event.type === 'playerDeath') playTone(70, 0.35, 'sawtooth');
      if (event.type === 'bossShoot') playTone(150, 0.04, 'sawtooth');
      if (event.type === 'bossDeath') playTone(60, 0.5, 'triangle');
      if (event.type === 'powerup') playTone(980, 0.16, 'triangle');
      if (event.type === 'chest') playTone(620, 0.12, 'sine');
    }
  }

  function playTone(frequency, duration, type = 'sine') {
    if (!soundToggle.checked) return;
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = Number(volumeRange.value) / 100 * 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
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
