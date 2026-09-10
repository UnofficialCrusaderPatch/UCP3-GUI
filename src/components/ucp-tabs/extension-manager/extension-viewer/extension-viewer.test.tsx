import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

describe('extension viewer relationships', () => {
  test('expands active reverse branches for the exact version and follows state changes', async () => {
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
    const summary = screen.getByText('extensions.viewer.relations');
    expect(summary.parentElement?.hasAttribute('open')).toBe(false);
    expect(screen.queryByRole('listitem')).toBeNull();
    fireEvent.click(summary);
    const packSummary = await screen.findByText('Display pack (1.0.0)');
    expect(summary.parentElement?.hasAttribute('open')).toBe(true);
    expect(screen.queryByText('Display campaign (1.0.0)')).toBeNull();
    expect(screen.queryByText('Display inactive (1.0.0)')).toBeNull();
    expect(screen.queryByText('Display pack (2.0.0)')).toBeNull();
    fireEvent.click(packSummary);
    expect(await screen.findByText('Display campaign (1.0.0)')).toBeTruthy();
    expect(tree.reverseExtensionDependenciesFor(library)).toEqual(edgesBefore);

    await act(async () => rerender(view(newerLibrary)));
    expect(screen.queryByRole('listitem')).toBeNull();
    expect(screen.queryByText('extensions.viewer.relations')).toBeNull();

    await act(async () => rerender(view(library)));
    expect(
      screen
        .getByText('extensions.viewer.relations')
        .parentElement?.hasAttribute('open'),
    ).toBe(false);
    act(() =>
      store.set(EXTENSION_STATE_INTERNAL_ATOM, { activeExtensions: [] }),
    );
    expect(screen.queryByRole('listitem')).toBeNull();
    expect(screen.queryByText('extensions.viewer.relations')).toBeNull();
  });

  test('shows both directions and unresolved requirements without running or changing resolution', async () => {
    const core = extension('core', '1.0.0');
    const library = extension('library', '1.0.0', { core: '^1.0.0' });
    const pack = extension('pack', '1.0.0', {
      library: '^1.0.0',
      missing: '^2.0.0',
      frontend: '>=1.0.0',
    });
    const campaign = extension('campaign', '1.0.0', { pack: '^1.0.0' });
    const extensions = [core, library, pack, campaign];
    const tree = new ExtensionDependencyTree(extensions, '1.0.17');
    tree.tryResolveAllDependencies();
    const solve = vi.spyOn(tree, 'extensionDependenciesFor');
    const graph = () =>
      extensions.map((ext) => {
        const node = tree.nodeForExtension(ext);
        return {
          incoming: node.edgesIn.map((edge) => edge.from.id),
          outgoing: node.edgesOut.map((edge) => edge.to?.id),
        };
      });
    const before = graph();
    const store = createStore();
    store.set(EXTENSION_STATE_INTERNAL_ATOM, {
      extensions,
      tree,
      activeExtensions: [core, library, pack, campaign],
    });
    render(
      <Provider store={store}>
        <ExtensionViewer args={{ extension: pack }} closeFunc={() => {}} />
      </Provider>,
    );
    fireEvent.click(screen.getByText('extensions.viewer.relations'));
    const forward = (
      await screen.findByRole('heading', {
        name: 'extensions.viewer.relations.dependencies',
      })
    ).parentElement!;
    const reverse = screen.getByRole('heading', {
      name: 'extensions.viewer.relations.dependents',
    }).parentElement!;
    expect(within(forward).getByText('Display library (1.0.0)')).toBeTruthy();
    expect(within(forward).getByText('frontend (1.0.17)')).toBeTruthy();
    expect(within(forward).getByText(/missing.*\^2.0.0/)).toBeTruthy();
    expect(
      within(forward).getByText(/extensions.viewer.relations.unresolved/),
    ).toBeTruthy();
    expect(within(reverse).getByText('Display campaign (1.0.0)')).toBeTruthy();
    expect(screen.queryByText('Display core (1.0.0)')).toBeNull();
    fireEvent.click(within(forward).getByText('Display library (1.0.0)'));
    expect(
      await within(forward).findByText('Display core (1.0.0)'),
    ).toBeTruthy();
    expect(solve).not.toHaveBeenCalled();
    expect(graph()).toEqual(before);
    act(() =>
      store.set(EXTENSION_STATE_INTERNAL_ATOM, { activeExtensions: [] }),
    );
    expect(within(reverse).queryByText('Display campaign (1.0.0)')).toBeNull();
    expect(within(forward).getByText('Display library (1.0.0)')).toBeTruthy();
    expect(graph()).toEqual(before);
  });

  test('stops cycles at the repeated node instead of recursively rendering forever', async () => {
    const a = extension('a', '1.0.0', { b: '^1.0.0' });
    const b = extension('b', '1.0.0', { a: '^1.0.0' });
    const tree = new ExtensionDependencyTree([a, b]);
    tree.tryResolveAllDependencies();
    const store = createStore();
    store.set(EXTENSION_STATE_INTERNAL_ATOM, { extensions: [a, b], tree });
    render(
      <Provider store={store}>
        <ExtensionViewer args={{ extension: a }} closeFunc={() => {}} />
      </Provider>,
    );
    fireEvent.click(screen.getByText('extensions.viewer.relations'));
    fireEvent.click(await screen.findByText('Display b (1.0.0)'));
    expect(
      await screen.findByText(/extensions.viewer.relations.cycle/),
    ).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
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
    expect(screen.queryByText('extensions.viewer.relations')).toBeNull();
  });
});
