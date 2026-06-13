import { DIRECTIONS } from './config.js';

const KEY_TO_DIRECTION = new Map([
  ['ArrowUp', DIRECTIONS.up],
  ['KeyW', DIRECTIONS.up],
  ['ArrowDown', DIRECTIONS.down],
  ['KeyS', DIRECTIONS.down],
  ['ArrowLeft', DIRECTIONS.left],
  ['KeyA', DIRECTIONS.left],
  ['ArrowRight', DIRECTIONS.right],
  ['KeyD', DIRECTIONS.right],
]);

export function bindInput({ canvas, touchPad, onDirection, onToggle }) {
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      onToggle();
      return;
    }

    const direction = KEY_TO_DIRECTION.get(event.code);
    if (direction) {
      event.preventDefault();
      onDirection(direction);
    }
  });

  touchPad.addEventListener('click', (event) => {
    const button = event.target.closest('[data-direction]');
    if (!button) {
      return;
    }
    onDirection(DIRECTIONS[button.dataset.direction]);
  });

  let startTouch = null;

  canvas.addEventListener('touchstart', (event) => {
    const [touch] = event.changedTouches;
    startTouch = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', (event) => {
    if (!startTouch) {
      return;
    }

    const [touch] = event.changedTouches;
    const deltaX = touch.clientX - startTouch.x;
    const deltaY = touch.clientY - startTouch.y;
    startTouch = null;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) {
      onToggle();
      return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      onDirection(deltaX > 0 ? DIRECTIONS.right : DIRECTIONS.left);
    } else {
      onDirection(deltaY > 0 ? DIRECTIONS.down : DIRECTIONS.up);
    }
  }, { passive: true });
}
