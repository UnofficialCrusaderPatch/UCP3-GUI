import { act, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { Range } from 'semver';
import { describe, expect, test, vi } from 'vitest';
import { Extension } from '../../../../config/ucp/common';
import { ExtensionDependencyTree } from '../../../../function/extensions/dependency-management/dependency-resolution';
import { EXTENSION_STATE_INTERNAL_ATOM } from '../../../../function/extensions/state/state';
import { ExtensionViewer } from './extension-viewer';

vi.mock('../../../general/message', () => ({
  default: ({ message }: { message: string | { key: string } }) =>
    typeof message === 'string' ? message : message.key,
}));

function extension(
  name: string,
  version: string,
  dependencies: Record<string, string> = {},
): Extension {
  return {
    name,
    version,
    definition: {
      name,
      version,
      'display-name': `Display ${name}`,
      dependencies: Object.fromEntries(
        Object.entries(dependencies).map(([key, range]) => [
          key,
          new Range(range),
        ]),
      ),
    },
    io: { fetchDescription: async () => 'Extension description' },
  } as Extension;
}

describe('extension viewer dependents', () => {
  test('shows only direct active dependents of the selected version and follows state changes', async () => {
    const library = extension('library', '1.0.0');
    const newerLibrary = extension('library', '2.0.0');
    const pack = extension('pack', '1.0.0', { library: '^1.0.0' });
    const newerPack = extension('pack', '2.0.0', { library: '^1.0.0' });
    const campaign = extension('campaign', '1.0.0', { pack: '=1.0.0' });
    const inactive = extension('inactive', '1.0.0', { library: '^1.0.0' });
    const extensions = [
      library,
      newerLibrary,
      pack,
      newerPack,
      campaign,
      inactive,
    ];
    const tree = new ExtensionDependencyTree(extensions);
    expect(tree.extensionDependenciesFor(campaign).status).toBe('OK');
    const edgesBefore = tree.reverseExtensionDependenciesFor(library);
    const store = createStore();
    store.set(EXTENSION_STATE_INTERNAL_ATOM, {
      extensions,
      tree,
      activeExtensions: [library, pack, campaign],
    });
    const view = (selected: Extension) => (
      <Provider store={store}>
        <ExtensionViewer args={{ extension: selected }} closeFunc={() => {}} />
      </Provider>
    );
    const { rerender } = render(view(library));

    expect(await screen.findByText('Extension description')).toBeTruthy();
    const summary = screen.getByText('extensions.viewer.required.by.one');
    expect(summary.parentElement?.hasAttribute('open')).toBe(false);
    fireEvent.click(summary);
    expect(summary.parentElement?.hasAttribute('open')).toBe(true);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(
      ['Display pack (1.0.0)'],
    );
    expect(tree.reverseExtensionDependenciesFor(library)).toEqual(edgesBefore);

    await act(async () => rerender(view(newerLibrary)));
    expect(screen.queryByRole('listitem')).toBeNull();
    expect(screen.queryByText('extensions.viewer.required.by.one')).toBeNull();

    await act(async () => rerender(view(library)));
    act(() =>
      store.set(EXTENSION_STATE_INTERNAL_ATOM, { activeExtensions: [] }),
    );
    expect(screen.queryByRole('listitem')).toBeNull();
    expect(screen.queryByText('extensions.viewer.required.by.one')).toBeNull();
  });

  test('keeps the description available if the extension is no longer in the tree', async () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <ExtensionViewer
          args={{ extension: extension('removed', '1.0.0') }}
          closeFunc={() => {}}
        />
      </Provider>,
    );
    expect(await screen.findByText('Extension description')).toBeTruthy();
    expect(screen.queryByText('extensions.viewer.required.by')).toBeNull();
  });
});
