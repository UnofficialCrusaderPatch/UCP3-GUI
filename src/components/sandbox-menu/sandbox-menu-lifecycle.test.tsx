import { runInNewContext } from 'node:vm';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createStore } from 'jotai';
import { beforeEach, expect, it, vi } from 'vitest';
import { SandboxMenu } from './sandbox-menu';
import { getStore } from '../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../function/configuration/state';
import { CREATOR_MODE_ATOM } from '../../function/gui-settings/settings';

const fixture = vi.hoisted(() => ({
  boots: [] as (() => Promise<void>)[],
  destroy: vi.fn(),
  release: undefined as undefined | (() => void),
}));

vi.mock('../../hooks/jotai/base', async (original) => ({
  ...(await original<typeof import('../../hooks/jotai/base')>()),
  getStore: vi.fn(),
}));
vi.mock('../../function/game-folder/utils', () => ({
  useCurrentGameFolder: () => 'C:/fixture',
}));
vi.mock('./texture-catalog-service', () => ({
  createGetTextureCatalogInputsFunction: () => async () => ({}),
}));
vi.mock('../general/message', () => ({
  default: ({ message }: { message: string }) => message,
}));

// Execute the actual frame script and consumer source. Only the iframe/RPC
// transport is simulated; host readiness, Save, qualifiers and persistence are real.
vi.mock('@jetbrains/websandbox', () => ({
  default: {
    create: (
      host: Record<string, unknown>,
      options: { codeToRunBeforeInit: string },
    ) => {
      const remote = {};
      const connection = {
        remoteMethodsWaitPromise: Promise.resolve(),
        remote: host,
        setLocalApi: (api: object) => Object.assign(remote, api),
      };
      runInNewContext(options.codeToRunBeforeInit, {
        Websandbox: { connection },
        addEventListener: (_name: string, callback: () => Promise<void>) =>
          fixture.boots.push(callback),
        dispatchEvent: () => {},
        window: { addEventListener: () => {} },
        document: { createTreeWalker: () => ({ nextNode: () => null }) },
        NodeFilter: { SHOW_TEXT: 1, SHOW_ELEMENT: 2 },
        Event,
        pause: () =>
          new Promise<void>((resolve) => {
            fixture.release = resolve;
          }),
        console,
      });
      return { connection: { remote }, destroy: fixture.destroy };
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.boots = [];
  fixture.release = undefined;
  vi.mocked(getStore).mockReturnValue(createStore());
});

function menu(js = '') {
  const close = vi.fn();
  const view = render(
    <SandboxMenu
      closeFunc={close}
      args={{
        baseUrl: 'textureSwapper',
        source: { html: '', css: '', js },
        localization: {},
        fallbackLocalization: {},
      }}
    />,
  );
  const save = screen.getByRole('button', {
    name: 'sandbox.save',
  }) as HTMLButtonElement;
  return { ...view, save, close };
}

it('waits for delayed initialization and saves values plus Creator qualifiers', async () => {
  getStore().set(CREATOR_MODE_ATOM, true);
  const { save } = menu(`
    SANDBOX_FUNCTIONS.whenReady = pause;
    SANDBOX_FUNCTIONS.getConfig = async () => ({ order: ['Winter', 'Arabia'] });
    SANDBOX_FUNCTIONS.getConfigQualifiers = async () => ({ order: 'required' });
  `);
  let boot!: Promise<void>;
  act(() => {
    boot = fixture.boots[0]();
  });
  await waitFor(() => expect(fixture.release).toBeTypeOf('function'));
  expect(save.disabled).toBe(true);
  await act(async () => {
    fixture.release!();
    await boot;
  });
  expect(save.disabled).toBe(false);
  fireEvent.click(save);
  await waitFor(() =>
    expect(getStore().get(CONFIGURATION_QUALIFIER_REDUCER_ATOM)).toEqual({
      'textureSwapper.order': 'required',
    }),
  );
  expect(
    getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)['textureSwapper.order'],
  ).toEqual(['Winter', 'Arabia']);
});

it('reports readiness rejection, leaves Save disabled, and permits Retry and Close', async () => {
  const { save, close } = menu(
    `SANDBOX_FUNCTIONS.whenReady = async () => { throw new Error('Damaged GM1'); };`,
  );
  await act(async () => fixture.boots[0]());
  expect(screen.getByRole('alert').textContent).toContain('Damaged GM1');
  expect(save.disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'sandbox.retry' }));
  expect(fixture.destroy).toHaveBeenCalledTimes(1);
  expect(fixture.boots).toHaveLength(2);
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'sandbox.close' }));
  expect(close).toHaveBeenCalledOnce();
});

it('supports legacy initialization and leaves the menu open after a failed Save', async () => {
  const { save, close } = menu(
    `SANDBOX_FUNCTIONS.getConfig = async () => { throw new Error('Invalid choice'); };`,
  );
  await act(async () => fixture.boots[0]());
  expect(save.disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'sandbox.save.close' }));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Invalid choice',
  );
  expect(close).not.toHaveBeenCalled();
  expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({});
});

it('discards late Save results after the menu closes', async () => {
  const { save, unmount } = menu(
    `SANDBOX_FUNCTIONS.getConfig = async () => { await pause(); return { order: ['stale'] }; };`,
  );
  await act(async () => fixture.boots[0]());
  fireEvent.click(save);
  await waitFor(() => expect(fixture.release).toBeTypeOf('function'));
  unmount();
  await act(async () => fixture.release!());
  expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({});
});
