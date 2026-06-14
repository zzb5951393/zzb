(function () {
  function createInput(canvas) {
    const input = {
      pointer: { x: 0, y: 0 },
      isBoostHeld: false,
      viewport: { width: canvas.clientWidth || 1280, height: canvas.clientHeight || 720 },
    };

    const updatePointer = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      input.pointer.x = clientX - rect.left;
      input.pointer.y = clientY - rect.top;
    };

    canvas.addEventListener('mousemove', (event) => updatePointer(event.clientX, event.clientY));
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) input.isBoostHeld = true;
      updatePointer(event.clientX, event.clientY);
    });
    window.addEventListener('mouseup', () => {
      input.isBoostHeld = false;
    });

    canvas.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0];
      input.isBoostHeld = true;
      updatePointer(touch.clientX, touch.clientY);
    }, { passive: true });
    canvas.addEventListener('touchmove', (event) => {
      const touch = event.changedTouches[0];
      updatePointer(touch.clientX, touch.clientY);
    }, { passive: true });
    canvas.addEventListener('touchend', () => {
      input.isBoostHeld = false;
    }, { passive: true });

    return input;
  }

  window.ExplorerSnakeInput = Object.freeze({ createInput });
}());
