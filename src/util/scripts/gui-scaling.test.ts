import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adjustGuiScale, installGuiScaling } from './gui-scaling';

const currentScale = () =>
  document.documentElement.style.getPropertyValue('--gui-scale');

function wheel(deltaY: number, ctrlKey = true) {
  const event = new WheelEvent('wheel', { deltaY, ctrlKey, cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe('GUI scaling', () => {
  let cleanup: () => void;

  beforeEach(() => {
    window.localStorage.clear();
    cleanup = installGuiScaling();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty('--gui-scale');
  });

  it('zooms through 150% to 200%, clamps both ends and preserves normal scrolling', () => {
    expect(currentScale()).toBe('1');
    expect(wheel(-100, false).defaultPrevented).toBe(false);
    expect(wheel(0).defaultPrevented).toBe(false);
    expect(currentScale()).toBe('1');
    expect(wheel(-100).defaultPrevented).toBe(true);
    wheel(-100);
    expect(currentScale()).toBe('1.5');
    for (let i = 0; i < 10; i += 1) wheel(-100);
    expect(currentScale()).toBe('2');
    expect(wheel(-100).defaultPrevented).toBe(true);
    for (let i = 0; i < 10; i += 1) wheel(100);
    expect(currentScale()).toBe('1');
  });

  it('supports keyboard adjustment and reset even while an input has focus', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    ['+', '=', '-', '0'].forEach((key, i) => {
      const event = new KeyboardEvent('keydown', {
        key,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(currentScale()).toBe(['1.25', '1.5', '1.25', '1'][i]);
    });
    input.remove();
  });

  it('remembers the scale and removes listeners before remounting', () => {
    wheel(-100);
    cleanup();
    expect(wheel(-100).defaultPrevented).toBe(false);
    cleanup = installGuiScaling();
    expect(currentScale()).toBe('1.25');
    wheel(-100);
    expect(currentScale()).toBe('1.5');
  });

  it.each(['NaN', 'Infinity', '0', '3', '1.3'])(
    'ignores invalid stored scale %s',
    (value) => {
      cleanup();
      window.localStorage.setItem('ucp3-gui-scale', value);
      cleanup = installGuiScaling();
      expect(currentScale()).toBe('1');
    },
  );

  it('works without storage and rejects invalid sandbox requests', () => {
    cleanup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    cleanup = installGuiScaling();
    adjustGuiScale(1);
    expect(currentScale()).toBe('1.25');
    adjustGuiScale(Number.NaN);
    adjustGuiScale(100);
    expect(currentScale()).toBe('1.25');
    adjustGuiScale(0);
    expect(currentScale()).toBe('1');
  });
});
