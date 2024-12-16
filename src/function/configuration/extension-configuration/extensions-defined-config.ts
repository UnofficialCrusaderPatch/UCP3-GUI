import { Extension } from '../../../config/ucp/common';
import {
  ConfigMetaObject,
  ConfigMetaObjectDB,
} from '../../../config/ucp/config-merge/objects';
import {
  extensionsToOptionEntries,
  getConfigDefaults,
} from '../../../config/ucp/extension-util';
import { ConfigurationLock, ConfigurationSuggestion } from '../state';

// eslint-disable-next-line import/prefer-default-export
export function buildExtensionsDefinedConfig(
  state: ConfigMetaObjectDB,
  activeExtensions: Extension[],
) {
  // This section is meant to allow the config editor to display the options.
  const optionEntries = extensionsToOptionEntries(activeExtensions);
  const uiDefinedDefaults = getConfigDefaults(optionEntries);

  const locks: { [key: string]: ConfigurationLock } = {};
  const suggestions: { [url: string]: ConfigurationSuggestion } = {};

  // This small section is meant to process the extensions and create an improved default configuration based on active extensions
  // TODO: make this rely on the extension state?

  const configDefinedValues: Record<string, unknown> = {};

  Object.entries(state).forEach(([url, cmo]: [string, ConfigMetaObject]) => {
    configDefinedValues[url] = cmo.modifications.value.content;
    if (cmo.modifications.value.qualifier === 'required') {
      locks[url] = {
        lockedBy: cmo.modifications.value.entityName,
        lockedValue: cmo.modifications.value.content,
      };
    } else if (
      cmo.modifications.value.qualifier === 'suggested' ||
      cmo.modifications.value.qualifier === 'unspecified'
    ) {
      suggestions[url] = {
        suggestedBy: cmo.modifications.value.entityName,
        suggestedValue: cmo.modifications.value.content,
      };
    }
  });

  // Here the values are set

  const extensionsDefinedConfig = {
    ...uiDefinedDefaults,
    ...configDefinedValues,
  };

  return {
    locks,
    suggestions,
    defined: extensionsDefinedConfig,
  };
}
