/**
 * Tests whether using a custom test store, loading extension data and displaying the configuration GUI works.
 * It checks for the presence of an option.
 *
 * Note: It is important that throughout the code, React Elements are instantiated using jsx syntax (<MyElement />), and
 * not using typescript syntax (<span>{MyElement()}</span>)
 */

import { waitFor, RenderResult, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { test, expect } from 'vitest';
import CreateSections from '../../../components/ucp-tabs/config-editor/ui-elements/ui-factory/CreateSections';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../extensions/state/state';
import { activateFirstTimeUseExtensions } from '../modifications/activate-first-time-use-extensions';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../testing/dump-extensions-state';

import TEST_DATA from './tests/load-extensions-state.test.data.json';

// @ts-expect-error 7031
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HydrateAtoms({ initialValues, children }): any {
  useHydrateAtoms(initialValues);
  return children;
}

// @ts-expect-error no typing
// eslint-disable-next-line react/prop-types
function TestProvider({ store, initialValues, children }) {
  return (
    <Provider store={store}>
      <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
    </Provider>
  );
}

// @ts-expect-error no type
// eslint-disable-next-line react/prop-types
function FullGUI2({ store }) {
  return (
    <TestProvider store={store} initialValues={[]}>
      <CreateSections readonly={false} />
    </TestProvider>
  );
}

function generateInitialState() {
  return deserializeSimplifiedSerializedExtensionsStateFromExtensions(
    JSON.parse(JSON.stringify(TEST_DATA.EXTENSIONS)),
  );
}

test('load-extensions-state full render using TEST_STORE', async () => {
  const TEST_STORE = createStore();

  const state1 = generateInitialState();
  const state2 = activateFirstTimeUseExtensions(state1).getOrThrow();

  TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state2);

  const renderResult: RenderResult = render(<FullGUI2 store={TEST_STORE} />);
  await waitFor(() => {
    expect(renderResult!.baseElement.textContent).toBeTruthy();

    const obj = screen.getAllByTitle('key: ucp2-legacy.ai_addattack');

    expect(obj.length > 0).toBe(true);
  });
});
