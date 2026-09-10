const STORAGE_KEY = 'ucp3-gui-scale';
const MIN_SCALE = 100;
const MAX_SCALE = 200;
const STEP = 10;

let scale = MIN_SCALE;

function applyScale(value: number) {
  scale = value;
  document.documentElement.style.setProperty(
    '--gui-scale',
    String(scale / 100),
  );
}

// Shared with sandbox menus, whose input events do not reach the host document.
export function adjustGuiScale(direction: number) {
  if (![-1, 0, 1].includes(direction)) return;
  applyScale(
    direction === 0
      ? MIN_SCALE
      : Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + direction * STEP)),
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, String(scale / 100));
  } catch {
    // Scaling should still work when webview storage is unavailable.
  }
}

export function installGuiScaling() {
  let saved = MIN_SCALE;
  try {
    saved = Number(window.localStorage.getItem(STORAGE_KEY)) * 100;
  } catch {
    // Use the default when webview storage is unavailable.
  }
  applyScale(
    Number.isFinite(saved) &&
      saved >= MIN_SCALE &&
      saved <= MAX_SCALE &&
      Math.abs(saved - Math.round(saved / STEP) * STEP) < 1e-8
      ? Math.round(saved / STEP) * STEP
      : MIN_SCALE,
  );

  const onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey || event.deltaY === 0) return;
    event.preventDefault();
    adjustGuiScale(event.deltaY < 0 ? 1 : -1);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.ctrlKey || !['+', '=', '-', '0'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === '0') adjustGuiScale(0);
    else adjustGuiScale(event.key === '-' ? -1 : 1);
  };

  window.addEventListener('wheel', onWheel, { passive: false, capture: true });
  window.addEventListener('keydown', onKeyDown, true);
  return () => {
    window.removeEventListener('wheel', onWheel, true);
    window.removeEventListener('keydown', onKeyDown, true);
  };
}
