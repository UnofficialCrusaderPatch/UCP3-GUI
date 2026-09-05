import { expect, it } from 'vitest';
import { Extension } from '../../../../config/ucp/common';
import { filterOutExtensions } from './filter-out-extensions';
import { removeProviderAiOverrides } from './remove-provider-ai-overrides';

const provider = {
  name: 'LOTO',
  version: '3.1.0',
  type: 'plugin',
  io: { path: 'D:/game/ucp/plugins/LOTO-3.1.0' },
} as Extension;
const ai = {
  name: 'Efendi',
  root: 'ucp/plugins/LOTO/resources/ai/Efendi',
  language: 'de',
  control: { speech: true },
};
const key = 'aiSwapper.ai.rat.speech';
const runtime = { name: ai.name, root: ai.root, language: 'de', active: true };

it('reproduces #320: filtering the removed plugin namespace leaves cross-module references', () => {
  const config = { [key]: runtime, 'aiSwapper.menu': { rat: [ai] } };
  expect(filterOutExtensions(config, [provider])).toEqual(config);
  const cleaned = removeProviderAiOverrides(config, [provider]);
  expect(cleaned).toEqual({ 'aiSwapper.menu': { rat: [] } });
  expect(config[key]).toEqual(runtime);
  expect(config['aiSwapper.menu'].rat).toEqual([ai]);
});
it('promotes the next remaining selection, including explicit false', () => {
  const next = {
    ...ai,
    name: 'Rat',
    root: 'ucp/plugins/Other/resources/ai/Rat',
    control: { speech: false },
  };
  const cleaned = removeProviderAiOverrides(
    { [key]: runtime, 'aiSwapper.menu': { rat: [ai, next] } },
    [provider],
  );
  expect(cleaned[key]).toEqual({
    name: 'Rat',
    root: next.root,
    language: 'de',
    active: false,
  });
  expect(cleaned['aiSwapper.menu']).toEqual({ rat: [next] });
});
it('handles versioned and absolute paths, without matching similarly named providers', () => {
  [
    'ucp/plugins/LOTO-3.1.0/resources/ai/Efendi',
    'D:\\game\\ucp\\plugins\\LOTO-3.1.0\\resources\\ai\\Efendi',
  ].forEach((root) => {
    expect(
      removeProviderAiOverrides({ [key]: { ...runtime, root } }, [provider]),
    ).toEqual({});
  });
  const config = {
    [key]: { ...runtime, root: 'ucp/plugins/LOTO-Extra/resources/ai/Efendi' },
    'other.value': 7,
  };
  expect(removeProviderAiOverrides(config, [provider])).toEqual(config);
});
it('preserves references if the provider remains active as a dependency', () => {
  const config = { [key]: runtime, 'aiSwapper.menu': { rat: [ai] } };
  expect(removeProviderAiOverrides(config, [])).toEqual(config);
});
