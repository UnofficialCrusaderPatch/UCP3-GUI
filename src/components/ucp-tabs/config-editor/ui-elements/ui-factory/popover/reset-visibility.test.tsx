import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import ResetSettingButton from './ResetSettingButton';
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
vi.mock('./CompactResetOverlay', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

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
