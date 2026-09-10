import { Suspense } from 'react';
import { createStore, Provider } from 'jotai';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Extension } from '../../../../config/ucp/common';

import { CREATOR_MODE_ATOM } from '../../../../function/gui-settings/settings';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import {
  OpenExtensionsFolderButton,
  InstalledExtensionFolderButton,
} from '../extension-elements/extension-element/shell-open-button';

const mocks = vi.hoisted(() => ({
  folder: 'C:/Spiel Ä Test',
  exists: { state: 'hasData', data: true },
  invoke: vi.fn().mockResolvedValue(undefined),
  modal: vi.fn().mockResolvedValue(undefined),
  localize: (key: string) => key,
}));

vi.mock('../../../../function/game-folder/utils', async () => {
  const { atom: makeAtom } = await import('jotai');
  return {
    useCurrentGameFolder: () => mocks.folder,
    DOES_UCP_FOLDER_EXIST_ATOM: makeAtom(() => mocks.exists),
  };
});
vi.mock('@tauri-apps/api/tauri', () => ({ invoke: mocks.invoke }));
vi.mock('@tauri-apps/api/os', () => ({ type: async () => 'Windows_NT' }));
vi.mock('../../../general/message', () => ({
  useMessage: () => mocks.localize,
}));
vi.mock('../../../modals/modal-ok', () => ({ showModalOk: mocks.modal }));
vi.mock('../../../footer/footer', async () => {
  const { atom: makeAtom } = await import('jotai');
  return { STATUS_BAR_MESSAGE_ATOM: makeAtom(undefined) };
});
vi.mock('../../../../util/scripts/logging', () => ({
  default: class {
    msg() {
      return this;
    }

    debug() {
      return this;
    }
  },
  ConsoleLogger: { error: vi.fn() },
}));

const extension = (path: string, type: 'plugin' | 'module' = 'plugin') =>
  ({
    type,
    io: {
      path,
      isDirectory: !path.endsWith('.zip'),
      isZip: path.endsWith('.zip'),
    },
  }) as Extension;

function setup(child: React.ReactNode, creator = false) {
  const store = createStore();
  store.set(CREATOR_MODE_ATOM, creator);
  const wrap = (content: React.ReactNode) => (
    <Provider store={store}>
      <Suspense>{content}</Suspense>
    </Provider>
  );
  return { ...render(wrap(child)), store, wrap };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.folder = 'C:/Spiel Ä Test';
  mocks.exists = { state: 'hasData', data: true };
});

async function openFolder(args: Record<string, unknown>) {
  const button = (await screen.findByRole('button')) as HTMLButtonElement;
  fireEvent.click(button);
  await waitFor(() =>
    expect(mocks.invoke).toHaveBeenLastCalledWith('open_extension_path', args),
  );
  await waitFor(() => expect(button.disabled).toBe(false));
}

describe('extension folder controls', () => {
  it('opens the current installation and follows an installation change', async () => {
    const view = setup(<OpenExtensionsFolderButton />);
    await openFolder({ gameFolder: mocks.folder });
    mocks.folder = 'D:/Zweite Installation';
    view.rerender(view.wrap(<OpenExtensionsFolderButton />));
    await openFolder({ gameFolder: mocks.folder });
  });

  it.each(['', 'C:/missing'])(
    'disables missing/unconfigured folders: %s',
    (folder) => {
      mocks.folder = folder;
      mocks.exists = { state: 'hasData', data: false };
      setup(<OpenExtensionsFolderButton />);
      const button = screen.getByRole('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
      expect(mocks.invoke).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    'reveals an installed module, active=%s',
    async (active) => {
      const ext = extension(
        `${mocks.folder}/ucp/modules/files-1.0.0.zip`,
        'module',
      );
      setup(<InstalledExtensionFolderButton extension={ext} active={active} />);
      await screen.findByRole('button', {
        name: 'extensions.extension.shell.reveal',
      });
      await openFolder({
        gameFolder: mocks.folder,
        path: ext.io.path,
        openDirectory: false,
      });
    },
  );

  it('preserves Creator active plugin folder opening and follows changed versions', async () => {
    const first = extension(`${mocks.folder}/ucp/plugins/test-1.0.0`);
    const view = setup(
      <InstalledExtensionFolderButton extension={first} active />,
      true,
    );
    await screen.findByRole('button', { name: 'extensions.extension.shell.open' });
    await openFolder({
      gameFolder: mocks.folder,
      path: first.io.path,
      openDirectory: true,
    });
    const second = extension(`${mocks.folder}/ucp/plugins/test-2.0.0`);
    view.rerender(
      view.wrap(
        <InstalledExtensionFolderButton extension={second} active={false} />,
      ),
    );
    await screen.findByRole('button', { name: 'extensions.extension.shell.reveal' });
    await openFolder({
      gameFolder: mocks.folder,
      path: second.io.path,
      openDirectory: false,
    });
  });

  it('reports host failures and provides keyboard focus feedback', async () => {
    mocks.invoke.mockRejectedValueOnce('Selected installation changed');
    const view = setup(<OpenExtensionsFolderButton />);
    const button = screen.getByRole('button', {
      name: 'extensions.folder.open',
    });
    fireEvent.focus(button);
    expect(view.store.get(STATUS_BAR_MESSAGE_ATOM)).toBe(
      'extensions.folder.open',
    );
    fireEvent.blur(button);
    expect(view.store.get(STATUS_BAR_MESSAGE_ATOM)).toBeUndefined();
    fireEvent.click(button);
    await waitFor(() =>
      expect(mocks.modal).toHaveBeenCalledWith({
        title: 'extensions.folder.error.title',
        message: 'extensions.folder.error.message',
      }),
    );
  });

  it('has no filesystem action for entries without installed storage', async () => {
    setup(
      <InstalledExtensionFolderButton
        extension={
          {
            io: {
              path: 'https://store.example/item',
              isDirectory: false,
              isZip: false,
            },
          } as Extension
        }
        active={false}
      />,
    );
    await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
