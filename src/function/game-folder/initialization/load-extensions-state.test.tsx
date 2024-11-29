import { createStore, Provider, useAtomValue } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { parse } from 'yaml';
import { afterEach, expect, test } from 'vitest';
import {
  cleanup,
  render,
  RenderResult,
  screen,
  waitFor,
} from '@testing-library/react';
import { useEffect } from 'react';
import CreateUCP2SliderChoice from '../../../components/ucp-tabs/config-editor/ui-elements/ui-factory/CreateUCP2SliderChoice';
import { UCP2SliderChoiceDisplayConfigElement } from '../../../config/ucp/common';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../testing/dump-extensions-state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../extensions/state/state';
import { activateFirstTimeUseExtensions } from '../modifications/activate-first-time-use-extensions';
import CreateSections from '../../../components/ucp-tabs/config-editor/ui-elements/ui-factory/CreateSections';
import { getStore } from '../../../hooks/jotai/base';
import { createBasicExtensionsState } from '../../extensions/state/init';

// "path": "C:.*/(ucp/.*)" => "path": "$1"
import TEST_DATA from './tests/load-extensions-state.test.data.json';
import { setupExtensionsStateConfiguration } from './load-extensions-state';
import { createExtensionID } from '../../global/constants/extension-id';
import { ExtensionsState } from '../../extensions/extensions-state';

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

const optionsYML = `
- category: ['{{ai}}', '{{improvements}}']
  name: ai_addattack_ui_alt
  display: UCP2SliderChoice
  hasHeader: true
  header: '{{ai_addattack}}'
  url: ucp2-legacy.ai_addattack
  contents:
    value:
      enabled: false
      choice: 'absolute'
      choices:
        absolute:
          slider: 5
        relative:
          slider: 0.3
    choices:
    - name: absolute
      min: 0
      max: 250
      step: 1
      text: '{{ai_addattack_descr}}'
    - name: relative
      min: 0.0
      max: 3.0
      step: 0.1
      text: '{{ai_addattack_alt_descr}}'

`;

function generateInitialState() {
  return deserializeSimplifiedSerializedExtensionsStateFromExtensions(
    JSON.parse(JSON.stringify(TEST_DATA.EXTENSIONS)),
  );
}

function GUI(props: { store: any }) {
  const { store } = props;
  return (
    <TestProvider store={store} initialValues={[]}>
      <CreateUCP2SliderChoice
        spec={parse(optionsYML)[0] as UCP2SliderChoiceDisplayConfigElement}
        className=""
        disabled={false}
      />
    </TestProvider>
  );
}

function FullGUI() {
  return (
    <TestProvider store={getStore()} initialValues={[]}>
      <CreateSections readonly={false} />
    </TestProvider>
  );
}

// Import line to ensure idempotency
afterEach(cleanup);

test('load-extensions-state working render', () => {
  const TEST_STORE = createStore();

  const state1 = generateInitialState();
  const result = activateFirstTimeUseExtensions(state1);

  const state2 = result.getOrThrow();
  TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state2);

  const gui = (
    <TestProvider store={TEST_STORE} initialValues={[]}>
      <CreateUCP2SliderChoice
        spec={parse(optionsYML)[0] as UCP2SliderChoiceDisplayConfigElement}
        className=""
        disabled={false}
      />
    </TestProvider>
  );
  const renderResult = render(gui);

  expect(renderResult.baseElement.textContent).toBeTruthy();

  const obj = screen.getByText('{{ai_addattack}}');

  expect(obj !== null).toBe(true);
});

test('load-extensions-state breaking render', () => {
  expect(() => {
    const TEST_STORE = createStore();
    const state1 = generateInitialState();
    TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state1);
    const gui = <GUI store={TEST_STORE} />;
    render(gui);
  }).toThrowError(
    'value and default value not defined for: ucp2-legacy.ai_addattack',
  );
});

test('load-extensions-state full render using getStore()', async () => {
  const state1 = generateInitialState();
  const state2 = activateFirstTimeUseExtensions(state1).getOrThrow();

  getStore().set(EXTENSION_STATE_REDUCER_ATOM, state2);

  const renderResult: RenderResult = render(<FullGUI />);
  await waitFor(() => {
    expect(renderResult!.baseElement.textContent).toBeTruthy();

    const obj = screen.getAllByTitle('key: ucp2-legacy.ai_addattack');

    expect(obj.length > 0).toBe(true);
  });

  getStore().set(
    EXTENSION_STATE_REDUCER_ATOM,
    createBasicExtensionsState([], '', ''),
  );
});

test('setupExtensionsStateConfiguration with empty state does not throw an error', async () => {
  await setupExtensionsStateConfiguration(
    createBasicExtensionsState([], '1.0.7', '3.0.5'),
    '',
    '',
  );
});

function DummyFunction({ state: initialState }: { state: ExtensionsState }) {
  useEffect(() => {
    setupExtensionsStateConfiguration(initialState, '', '');
  }, [initialState]);

  const trackedState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  return (
    <div role="document">
      {trackedState.activeExtensions
        .map((ext) => createExtensionID(ext))
        .join('\n')}
    </div>
  );
}

function DummyGUI({ store, state }: { store: any; state: ExtensionsState }) {
  return (
    <TestProvider store={store} initialValues={[]}>
      <DummyFunction state={state} />
    </TestProvider>
  );
}

test('setupExtensionsStateConfiguration with proper state creates first time use data', async () => {
  const TEST_STORE = getStore();

  const state1 = generateInitialState();

  const gui = <DummyGUI store={TEST_STORE} state={state1} />;

  render(gui);

  await waitFor(() => {
    expect(
      screen
        .getByRole('document')
        .textContent?.replaceAll('\n', '')
        .replaceAll(' ', ''),
    ).toEqual(
      `graphicsApiReplacer@1.2.0
                winProcHandler@0.2.0
                ucp2-legacy-defaults@2.15.1
                ucp2-vanilla-fixed-aiv@2.15.1
                ucp2-aic-patch@2.15.1
                ucp2-ai-files@2.15.1
                aiSwapper@1.1.0
                aivloader@1.0.0
                files@1.1.0
                aicloader@1.1.0
                textResourceModifier@0.3.0
                gmResourceModifier@0.2.0
                ucp2-legacy@2.15.1`
        .replaceAll('\n', '')
        .replaceAll(' ', ''),
    );
    expect(
      TEST_STORE.get(EXTENSION_STATE_REDUCER_ATOM)
        .activeExtensions.map((ext) => createExtensionID(ext))
        .join(''),
    ).toEqual(
      `graphicsApiReplacer@1.2.0
       winProcHandler@0.2.0
       ucp2-legacy-defaults@2.15.1
       ucp2-vanilla-fixed-aiv@2.15.1
       ucp2-aic-patch@2.15.1
       ucp2-ai-files@2.15.1
       aiSwapper@1.1.0
       aivloader@1.0.0
       files@1.1.0
       aicloader@1.1.0
       textResourceModifier@0.3.0
       gmResourceModifier@0.2.0
       ucp2-legacy@2.15.1`
        .replaceAll('\n', '')
        .replaceAll(' ', ''),
    );
  });
});
