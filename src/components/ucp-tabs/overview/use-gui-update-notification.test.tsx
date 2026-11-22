import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeToast } from '../../toasts/toasts-display';
import { shellOpen } from '../../../tauri/tauri-shell';
import useGUIUpdateNotification from './use-gui-update-notification';

vi.mock('../../toasts/toasts-display', () => ({ makeToast: vi.fn() }));
vi.mock('../../../tauri/tauri-shell', () => ({
  shellOpen: vi.fn().mockResolvedValue(undefined),
}));

describe('GUI update notification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('waits for an available update and does not repeat on tab renders', () => {
    const { rerender } = renderHook(
      ({ available }) => useGUIUpdateNotification(available),
      { initialProps: { available: false } },
    );
    expect(makeToast).not.toHaveBeenCalled();

    rerender({ available: true });
    expect(makeToast).toHaveBeenCalledTimes(1);
    rerender({ available: true });
    rerender({ available: true });
    expect(makeToast).toHaveBeenCalledTimes(1);
  });

  it('does not repeat after a query loses and regains its success state', () => {
    const { rerender } = renderHook(
      ({ available }) => useGUIUpdateNotification(available),
      { initialProps: { available: true } },
    );
    rerender({ available: false });
    rerender({ available: true });
    expect(makeToast).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate a cached update during StrictMode effect replay', () => {
    renderHook(() => useGUIUpdateNotification(true), { wrapper: StrictMode });
    expect(makeToast).toHaveBeenCalledTimes(1);
  });

  it('offers a manual download that also works for .deb installations', () => {
    renderHook(() => useGUIUpdateNotification(true));
    const [notice] = vi.mocked(makeToast).mock.calls[0];
    expect(notice.body).toBe('Download the latest GUI from the releases page.');
    notice.onClick?.();
    expect(shellOpen).toHaveBeenCalledWith(
      'https://github.com/UnofficialCrusaderPatch/UCP3-GUI/releases',
    );
  });
});
