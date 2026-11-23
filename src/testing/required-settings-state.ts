import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from './dump-extensions-state';
import { buildExtensionConfigurationDB } from '../function/configuration/extension-configuration/build-extension-configuration-db';
import { parseConfigEntries } from '../function/extensions/discovery/parse-config-entries';

/** Legacy plus Custom Hotkeys, which requires a Legacy option, as installed extensions. */
export function requiredSettingsExtensions(requiredValue: unknown = false) {
  const { configEntries } = parseConfigEntries({
    meta: { version: '1.0.0' },
    'config-sparse': {
      modules: {
        'ucp2-legacy': {
          config: {
            o_keys: {
              enabled: { contents: { 'required-value': requiredValue } },
            },
            unrelated: { contents: { 'suggested-value': 'suggested' } },
          },
        },
      },
      plugins: {},
      'load-order': [],
    },
  });
  const extensions = ['ucp2-legacy', 'custom-hotkeys'].map((name) => ({
    name,
    version: name === 'ucp2-legacy' ? '2.15.1' : '0.2.1',
    type: 'module',
    definition: {
      meta: { version: '1.0.0' },
      name,
      version: name === 'ucp2-legacy' ? '2.15.1' : '0.2.1',
      author: 'test',
      dependencies: {},
      'display-name': name,
      description: '',
      type: 'module' as const,
    },
    configEntries: name === 'custom-hotkeys' ? configEntries : {},
  }));
  return deserializeSimplifiedSerializedExtensionsStateFromExtensions(
    extensions,
  );
}

/** Both extensions active, so Custom Hotkeys locks the Legacy option. */
export function requiredSettingsState(requiredValue: unknown = false) {
  const state = requiredSettingsExtensions(requiredValue);
  return buildExtensionConfigurationDB({
    ...state,
    activeExtensions: state.extensions,
    explicitlyActivatedExtensions: state.extensions,
  });
}
