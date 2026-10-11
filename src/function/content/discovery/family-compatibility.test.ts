import { expect, it } from 'vitest';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../testing/dump-extensions-state';
import { activateFirstTimeUseExtensions } from '../../game-folder/modifications/activate-first-time-use-extensions';
import { serializeLoadOrder } from '../../../config/ucp/config-files/load-order';
import TEST_DATA from '../../game-folder/initialization/tests/load-extensions-state.test.data.json';

it('family metadata does not change existing dependency activation, merge results or saved identity', () => {
  const legacy = deserializeSimplifiedSerializedExtensionsStateFromExtensions(
    JSON.parse(JSON.stringify(TEST_DATA.EXTENSIONS)),
  );
  const grouped = deserializeSimplifiedSerializedExtensionsStateFromExtensions(
    JSON.parse(JSON.stringify(TEST_DATA.EXTENSIONS)),
  );
  grouped.extensions.forEach((ext) => {
    if (
      ext.name !== 'Aggressive-AI-Behaviour' &&
      ext.name !== 'Aggressive-AI-Behaviour-Applied'
    )
      return;
    const { definition } = ext;
    definition.family = [
      {
        name: 'aggressive-ai-behaviour',
        ...(ext.name === 'Aggressive-AI-Behaviour' ? { root: true } : {}),
      },
    ];
  });
  const before = activateFirstTimeUseExtensions(legacy).getOrThrow();
  const after = activateFirstTimeUseExtensions(grouped).getOrThrow();
  expect(serializeLoadOrder(after.activeExtensions)).toEqual(
    serializeLoadOrder(before.activeExtensions),
  );
  expect(after.configuration.defined).toEqual(before.configuration.defined);
  expect(after.configuration.locks).toEqual(before.configuration.locks);
  expect(after.configuration.suggestions).toEqual(
    before.configuration.suggestions,
  );
  expect(after.configuration.errors).toEqual(before.configuration.errors);
  expect(after.explicitlyActivatedExtensions.map((ext) => ext.name)).toEqual(
    before.explicitlyActivatedExtensions.map((ext) => ext.name),
  );
});
