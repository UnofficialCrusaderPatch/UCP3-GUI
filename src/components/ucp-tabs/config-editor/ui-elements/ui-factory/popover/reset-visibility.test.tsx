import { afterEach, expect, test, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import ResetSettingButton from './ResetSettingButton';
import { ConfigPopover } from './ConfigPopover';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../../function/configuration/state';

vi.mock('../../../../../../function/configuration/derived-state', async () => ({
  CONFIGURATION_DEFAULTS_REDUCER_ATOM: (await import('jotai')).atom({
    setting: false,
  }),
  CONFIGURATION_LOCKS_REDUCER_ATOM: (await import('jotai')).atom({}),
}));
vi.mock('../../../../../footer/footer', async () => ({
  STATUS_BAR_MESSAGE_ATOM: (await import('jotai')).atom(undefined),
}));
vi.mock('../../../../common/buttons/config-serialized-state', async () => ({
  CONFIG_EXTENSIONS_DIRTY_STATE_ATOM: (await import('jotai')).atom(false),
}));
vi.mock('../../../../../general/message', () => ({
  useMessage: () => (key: string) => key,
}));
vi.mock('../../../../../../function/gui-settings/settings', async () => ({
  CREATOR_MODE_ATOM: (await import('jotai')).atom(false),
}));
vi.mock('./CompactResetOverlay', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

test('reset stays reachable when the pointer leaves the field and enters its popup', async () => {
  const store = createStore();
  store.set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'set-multiple',
    value: { setting: true },
  });
  store.set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'set-multiple',
    value: { setting: true },
  });
  const target = document.createElement('div');
  document.body.append(target);
  const ref = { current: target } as unknown as React.MutableRefObject<null>;
  const view = render(
    <Provider store={store}>
      <ConfigPopover url="setting" show theRef={ref} />
    </Provider>,
  );
  const button = await screen.findByRole('button');
  view.rerender(
    <Provider store={store}>
      <ConfigPopover url="setting" show={false} theRef={ref} />
    </Provider>,
  );
  // Crossing the small gap must not close the popup before entering the bin.
  await act(() => new Promise((resolve) => window.setTimeout(resolve, 30)));
  fireEvent.mouseEnter(button.closest('.ucp-popover')!);
  await act(() => new Promise((resolve) => window.setTimeout(resolve, 400)));
  expect(screen.getByRole('button')).toBe(button);
  fireEvent.click(button);
  expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)).not.toHaveProperty(
    'setting',
  );
  expect(screen.queryByRole('button')).toBeNull();
  await act(() => {
    store.set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'set-multiple',
      value: { setting: true },
    });
    store.set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
      type: 'set-multiple',
      value: { setting: true },
    });
  });
  expect(screen.queryByRole('button')).toBeNull();
  target.remove();
});

test.each([false, true])(
  'reset visibility and effect are consistent (compact=%s)',
  (compact) => {
    const store = createStore();
    // A loaded explicit value is not a newly touched setting.
    store.set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'set-multiple',
      value: { setting: true },
    });
    const view = render(
      <Provider store={store}>
        <ResetSettingButton url="setting" compact={compact} />
      </Provider>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    view.unmount();
    // Choosing the default explicitly is still a removable override.
    store.set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'set-multiple',
      value: { setting: false },
    });
    store.set(CONFIGURATION_FULL_REDUCER_ATOM, {
      type: 'set-multiple',
      value: { setting: false },
    });
    store.set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
      type: 'set-multiple',
      value: { setting: true },
    });
    render(
      <Provider store={store}>
        <ResetSettingButton url="setting" compact={compact} />
      </Provider>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)).not.toHaveProperty(
      'setting',
    );
    expect(store.get(CONFIGURATION_TOUCHED_REDUCER_ATOM)).not.toHaveProperty(
      'setting',
    );
    expect(store.get(CONFIGURATION_FULL_REDUCER_ATOM)).toHaveProperty(
      'setting',
      false,
    );
    expect(screen.queryByRole('button')).toBeNull();
  },
);
