import { Provider, createStore, useAtomValue } from 'jotai';
import { Suspense } from 'react';
import {
  fireEvent,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FamilyList } from './family-list';
import { getStore } from '../../../../hooks/jotai/base';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../../testing/dump-extensions-state';
import DATA from '../../../../function/game-folder/initialization/tests/load-extensions-state.test.data.json';
import { ActiveExtensionElement } from '../../extension-manager/extension-elements/extension-element/active-extension-element';
import { InactiveExtensionsElement } from '../../extension-manager/extension-elements/extension-element/inactive-extension-element';
import { serializeLoadOrder } from '../../../../config/ucp/config-files/load-order';
import { familyConfigurationMembers } from '../../../../function/extensions/dependency-management/families';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { CONFIGURATION_USER_REDUCER_ATOM } from '../../../../function/configuration/state';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../buttons/config-serialized-state';

afterEach(cleanup);

// Folder controls read native host information on each row.
vi.mock('@tauri-apps/api/os', () => ({ type: async () => 'Windows_NT' }));
vi.mock('../../../../tauri/tauri-invoke', async (original) => ({
  ...(await original<typeof import('../../../../tauri/tauri-invoke')>()),
  getGuiConfigRecentFolders: async () => [],
}));

vi.mock('../../../../hooks/jotai/base', async (original) => ({
  ...(await original<typeof import('../../../../hooks/jotai/base')>()),
  getStore: vi.fn(),
}));
vi.mock('../../../general/message', () => ({
  useMessage:
    () => (message: string | { key: string; args: { name: string } }) =>
      typeof message === 'string'
        ? message
        : `${message.key}:${message.args.name}`,
}));
vi.mock('../../../modals/modal-ok-cancel', () => ({
  showModalOkCancel: vi.fn(async () => true),
}));
vi.mock('../../../modals/modal-ok', () => ({ showModalOk: vi.fn() }));
vi.mock('../../extension-manager/extension-elements/reporting', () => ({
  default: async () => true,
}));

function Lists() {
  const state = useAtomValue(EXTENSION_STATE_INTERFACE_ATOM);
  const available = state.extensions.map((ext) => ({
    id: `${ext.name}@${ext.version}`,
    name: ext.name,
    ext,
    family: ext.definition.family,
    active: state.activeExtensions.some((active) => active.name === ext.name),
  }));
  return (
    <>
      <div data-testid="available">
        <FamilyList
          activation={false}
          scope="roundtrip-available"
          searching={false}
          items={available}
          available={available}
          selected={familyConfigurationMembers(state).map(
            (ext) => available.find((item) => item.ext === ext)!,
          )}
          familyLabel={() => 'Aggressive AI Behaviour'}
          configurationLabel={(_, { ext }) =>
            ext.name.endsWith('-Applied') ? 'Applied' : 'Bare'
          }
          label={({ ext }) => ext.definition['display-name'] || ext.name}
          render={({ ext }, familyToggle, familyRow) => (
            <div data-testid={ext.name}>
              <InactiveExtensionsElement
                exts={[ext]}
                familyToggle={familyToggle}
                familyRow={familyRow}
                selectedExtension={familyRow ? ext : undefined}
              />
            </div>
          )}
        />
      </div>
      <div data-testid="active">
        {state.activeExtensions.map((ext, index) => (
          <div key={ext.name} data-testid={ext.name}>
            <ActiveExtensionElement
              ext={ext}
              arr={state.activeExtensions}
              index={index}
            />
          </div>
        ))}
      </div>
    </>
  );
}

const BARE = 'Aggressive-AI-Behaviour';
const APPLIED = 'Aggressive-AI-Behaviour-Applied';

function fixtureStore(rootDefault?: string) {
  const store = createStore();
  vi.mocked(getStore).mockReturnValue(store);
  const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions(
    JSON.parse(JSON.stringify(DATA.EXTENSIONS)),
  );
  state.extensions.forEach((ext) => {
    // Serialized dependency fixtures omit the disk handle used by cleanup.
    Object.assign(ext, {
      io: {
        path: `C:/test/ucp/${ext.type === 'module' ? 'modules' : 'plugins'}/${ext.name}-${ext.version}`,
      },
    });
    if ([BARE, APPLIED].includes(ext.name))
      Object.assign(ext.definition, {
        family: [
          ext.name === BARE
            ? {
                name: 'aggressive-ai-behaviour',
                root: true,
                members: [APPLIED],
                ...(rootDefault ? { default: rootDefault } : {}),
              }
            : { name: 'aggressive-ai-behaviour' },
        ],
      });
  });
  store.set(EXTENSION_STATE_INTERFACE_ATOM, state);
  render(
    <Provider store={store}>
      <Suspense>
        <Lists />
      </Suspense>
    </Provider>,
  );
  return { store, state };
}

const switchButton = (row: HTMLElement) =>
  within(row).getByRole('button', { name: 'discovery.family.switch' });

it('offers the default member, switches to Bare and deactivates while the active pane stays flat', async () => {
  const { store } = fixtureStore(APPLIED);
  const left = within(await screen.findByTestId('available'));
  const right = within(screen.getByTestId('active'));

  fireEvent.click(
    left.getByRole('button', { name: 'discovery.family.switch' }),
  );
  await waitFor(() =>
    expect(left.getByText('Aggressive AI Behaviour: Applied')).toBeTruthy(),
  );
  expect(
    store
      .get(EXTENSION_STATE_INTERFACE_ATOM)
      .explicitlyActivatedExtensions.map((e) => e.name),
  ).toEqual([APPLIED]);
  // Bare stays a provider in the flat active list.
  expect(right.getByTestId(BARE)).toBeTruthy();
  expect(right.getByTestId(APPLIED)).toBeTruthy();
  expect(right.queryByRole('button', { name: /discovery.expand/ })).toBeNull();

  fireEvent.click(
    left.getByRole('button', {
      name: 'discovery.expand:Aggressive AI Behaviour',
    }),
  );
  fireEvent.click(switchButton(left.getByTestId(BARE)));
  await waitFor(() => expect(right.queryByTestId(APPLIED)).toBeNull());
  expect(left.getByText('Aggressive AI Behaviour: Bare')).toBeTruthy();
  const selected = store.get(EXTENSION_STATE_INTERFACE_ATOM);
  expect(
    serializeLoadOrder(selected.activeExtensions).some(
      ({ extension }) => extension === APPLIED,
    ),
  ).toBe(false);
  expect(
    Object.values(selected.configuration.state).some((entry) =>
      Object.values(entry.modifications).some(
        (value) => value.entityName === APPLIED,
      ),
    ),
  ).toBe(false);

  fireEvent.click(
    within(right.getByTestId(BARE)).getByRole('button', { name: 'deactivate' }),
  );
  await waitFor(() =>
    expect(store.get(EXTENSION_STATE_INTERFACE_ATOM).activeExtensions).toEqual(
      [],
    ),
  );
});

it('cancelling a switch keeps the selected configuration, preferences and dirty state', async () => {
  const { store, state } = fixtureStore();
  const applied = state.extensions.find((ext) => ext.name === APPLIED)!;
  const [url, entry] = Object.entries(applied.configEntries)[0];
  Object.assign(entry.contents, { 'required-value': false });
  const left = within(await screen.findByTestId('available'));
  fireEvent.click(
    left.getByRole('button', { name: 'discovery.family.switch' }),
  );
  await waitFor(() =>
    expect(
      store.get(EXTENSION_STATE_INTERFACE_ATOM).explicitlyActivatedExtensions,
    ).toHaveLength(1),
  );
  store.set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: { [url]: true },
  });
  store.set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, false);
  const committed = store.get(EXTENSION_STATE_INTERFACE_ATOM);
  vi.mocked(showModalOkCancel).mockResolvedValueOnce(false);
  fireEvent.click(
    left.getByRole('button', {
      name: 'discovery.expand:Aggressive AI Behaviour',
    }),
  );
  fireEvent.click(switchButton(left.getByTestId(APPLIED)));
  await waitFor(() => expect(showModalOkCancel).toHaveBeenCalled());
  expect(store.get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(committed);
  expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({ [url]: true });
  expect(store.get(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM)).toBe(false);
});
