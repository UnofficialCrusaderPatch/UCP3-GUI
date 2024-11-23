import { Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { parse } from 'yaml';
import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreateUCP2SliderChoice from '../../../components/ucp-tabs/config-editor/ui-elements/ui-factory/CreateUCP2SliderChoice';
import { UCP2SliderChoiceDisplayConfigElement } from '../../../config/ucp/common';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../testing/dump-extensions-state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../extensions/state/state';
import { activateFirstTimeUseExtensions } from '../modifications/activate-first-time-use-extensions';
import { setExtensionsStateAndClearConfiguration } from '../../extensions/state/init';
import { CONFIGURATION_DEFAULTS_REDUCER_ATOM } from '../../configuration/derived-state';

// "path": "C:.*/(ucp/.*)" => "path": "$1"
import TEST_DATA from './tests/load-extensions-state.test.data.json';
import { getStore } from '../../../hooks/jotai/base';

const TEST_STORE = getStore();

// @ts-expect-error 7031
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HydrateAtoms({ initialValues, children }): any {
  useHydrateAtoms(initialValues);
  return children;
}

// @ts-expect-error 7031
// eslint-disable-next-line react/prop-types
function TestProvider({ initialValues, children }) {
  return (
    <Provider store={getStore()}>
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

function GUI() {
  return (
    <TestProvider initialValues={[]}>
      {CreateUCP2SliderChoice({
        spec: parse(optionsYML)[0] as UCP2SliderChoiceDisplayConfigElement,
        className: '',
        disabled: false,
      })}
    </TestProvider>
  );
}

test('load-extensions-state basic render', () => {
  const state1 = generateInitialState();
  const result = activateFirstTimeUseExtensions(state1);

  const state2 = result.getOrThrow();
  TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state2);

  const gui = <GUI />;
  const renderResult = render(gui);

  expect(renderResult.baseElement.textContent).toBeTruthy();

  const obj = screen.getByText('{{ai_addattack}}');

  expect(obj !== null).toBe(true);
});

test('load-extensions-state breaking render', () => {
  const state1 = generateInitialState();

  TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state1);

  const gui = <GUI />;
  const renderResult = render(gui);

  const result = activateFirstTimeUseExtensions(state1);

  expect(
    result.getOrThrow().configuration.defined['ucp2-legacy.ai_addattack'],
  ).toBe(false);

  expect(
    TEST_STORE.get(CONFIGURATION_DEFAULTS_REDUCER_ATOM)[
      'ucp2-legacy.ai_addattack'
    ],
  ).toBe(false);

  const state2 = result.getOrThrow();
  TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state2);

  expect(renderResult.baseElement.textContent).toBeTruthy();

  const obj = screen.getAllByTitle('key: ucp2-legacy.ai_addattack');

  expect(obj.length > 0).toBe(true);
});

test('load-extensions-state breaking render 2', () => {
  const state1 = generateInitialState();

  TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state1);

  const gui = <GUI />;
  const renderResult = render(gui);

  const result = activateFirstTimeUseExtensions(state1);

  const state2 = result.getOrThrow();
  setExtensionsStateAndClearConfiguration(state2);

  expect(renderResult.baseElement.textContent).toBeTruthy();

  const obj = screen.getAllByTitle('key: ucp2-legacy.ai_addattack');

  expect(obj.length > 0).toBe(true);
});

// function FullGUI() {
//   return (
//     <TestProvider initialValues={[]}>
//       {UIFactory.CreateSections({ readonly: false }).content}
//     </TestProvider>
//   );
// }

// test('load-extensions-state full render', () => {
//   const state1 = generateInitialState();

//   TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state1);

//   const gui = <FullGUI />;
//   const renderResult = render(gui);

//   const result = activateFirstTimeUseExtensions(state1);

//   const state2 = result.getOrThrow();
//   TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state2);

//   expect(renderResult.baseElement.textContent).toBeTruthy();

//   const obj = screen.getAllByTitle('key: ucp2-legacy.ai_addattack');

//   expect(obj.length > 0).toBe(true);
// });

// test('load-extensions-state succesfull full render', () => {
//   const state1 = generateInitialState();

//   TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state1);

//   const gui = <FullGUI />;
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   const renderResult = render(gui);

//   const result = activateFirstTimeUseExtensions(state1);

//   const state2 = result.getOrThrow();
//   TEST_STORE.set(EXTENSION_STATE_REDUCER_ATOM, state2);

//   expect(TEST_STORE.get(LOCALIZED_UI_OPTION_ENTRIES_ATOM).length).toBe(58);

//   const obj = screen.getAllByTitle('key: ucp2-legacy.ai_addattack');

//   expect(obj.length > 0).toBe(true);
// });
