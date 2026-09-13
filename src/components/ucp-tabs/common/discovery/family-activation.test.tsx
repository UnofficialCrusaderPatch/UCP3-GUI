import { Provider, createStore, useAtomValue } from 'jotai';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { FamilyList } from './family-list';
import { getStore } from '../../../../hooks/jotai/base';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../../testing/dump-extensions-state';
import DATA from '../../../../function/game-folder/initialization/tests/load-extensions-state.test.data.json';
import { ActiveExtensionElement } from '../../extension-manager/extension-elements/extension-element/active-extension-element';
import { InactiveExtensionsElement } from '../../extension-manager/extension-elements/extension-element/inactive-extension-element';
import { serializeLoadOrder } from '../../../../config/ucp/config-files/load-order';

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
      {[false, true].map((activation) => (
        <div
          key={String(activation)}
          data-testid={activation ? 'active' : 'available'}
        >
          <FamilyList
            activation={activation}
            scope={`roundtrip-${activation}`}
            searching={false}
            items={available.filter((item) => item.active === activation)}
            available={available}
            label={({ ext }) => ext.definition['display-name'] || ext.name}
            render={({ ext, active }, familyToggle) => (
              <div data-testid={ext.name}>
                {active ? (
                  <ActiveExtensionElement
                    ext={ext}
                    arr={state.activeExtensions}
                    index={state.activeExtensions.findIndex(
                      (entry) => entry.name === ext.name,
                    )}
                    familyToggle={familyToggle}
                  />
                ) : (
                  <InactiveExtensionsElement
                    exts={[ext]}
                    familyToggle={familyToggle}
                  />
                )}
              </div>
            )}
          />
        </div>
      ))}
    </>
  );
}

it('activates and deactivates the real UCP2 Bare child without activating or applying its Default root', async () => {
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
    if (['ucp2-legacy', 'ucp2-legacy-defaults'].includes(ext.name))
      Object.assign(ext.definition, {
        family: [
          {
            name: 'ucp2',
            ...(ext.name === 'ucp2-legacy-defaults' ? { root: true } : {}),
          },
        ],
      });
  });
  store.set(EXTENSION_STATE_INTERFACE_ATOM, state);
  render(
    <Provider store={store}>
      <Lists />
    </Provider>,
  );
  const left = within(screen.getByTestId('available'));
  const right = within(screen.getByTestId('active'));
  const root = state.extensions.find(
    (ext) => ext.name === 'ucp2-legacy-defaults',
  )!;
  fireEvent.click(
    left.getByRole('button', {
      name: `discovery.expand:${root.definition['display-name'] || root.name}`,
    }),
  );
  fireEvent.click(
    within(left.getByTestId('ucp2-legacy')).getByRole('button', {
      name: 'activate',
    }),
  );
  await waitFor(() => expect(right.getByTestId('ucp2-legacy')).toBeTruthy());
  expect(right.queryByTestId('ucp2-legacy-defaults')).toBeNull();
  const selected = store.get(EXTENSION_STATE_INTERFACE_ATOM);
  expect(selected.explicitlyActivatedExtensions.map((ext) => ext.name)).toEqual(
    ['ucp2-legacy'],
  );
  expect(
    serializeLoadOrder(selected.activeExtensions).some(
      ({ extension }) => extension === root.name,
    ),
  ).toBe(false);
  expect(
    Object.values(selected.configuration.state).some((entry) =>
      Object.values(entry.modifications).some(
        (value) => value.entityName === root.name,
      ),
    ),
  ).toBe(false);
  const deactivate = within(right.getByTestId('ucp2-legacy')).getByRole(
    'button',
    { name: 'deactivate' },
  ) as HTMLButtonElement;
  expect(deactivate.disabled).toBe(false);
  fireEvent.click(deactivate);
  await waitFor(() =>
    expect(store.get(EXTENSION_STATE_INTERFACE_ATOM).activeExtensions).toEqual(
      [],
    ),
  );
  expect(right.queryByTestId('ucp2-legacy')).toBeNull();
});
