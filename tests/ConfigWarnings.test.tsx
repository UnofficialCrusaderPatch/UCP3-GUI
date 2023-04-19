import { describe, expect, test } from 'vitest';
import YAML from 'yaml';
import { Extension, OptionEntry } from '../src/config/ucp/common';

import { isAllValidExtensionConfigOrder } from '../src/config/ucp/extension-permissions';
import {
  collectConfigs,
  collectOptions,
  Config,
} from '../src/config/ucp/config';

/**
 * This config yaml file should fail, because a value is not set
 *
 *
 */
const configYaml = `

- name: a
  type: module
  version: 0.0.1
  ui:
  - name: option1
    type: boolean
    url: option1
    default:
      value: true
  config: {}
  path: ucp/modules/a-0.0.1
  configEntries: {}
  optionEntries: {}
  
- name: b
  type: module
  version: 0.0.1
  ui: []
  config:
    modules:
      a:
        option1:
          # required
          value: true
  path: ucp/modules/b-0.0.1
  configEntries: {}
  optionEntries: {}
  
- name: c
  type: module
  version: 0.0.1
  ui: []
  config:
    modules:
      a:
        option1:
          value: false
  path: ucp/modules/c-0.0.1
  configEntries: {}
  optionEntries: {}


`;

const activatedExtensions: Extension[] = YAML.parse(configYaml);

activatedExtensions.forEach((ext) => {
  const { name, ui } = ext;

  const optionsCollection: { [key: string]: OptionEntry } = {};
  collectOptions(
    optionsCollection,
    ui as unknown as { [key: string]: unknown },
    name
  );

  const processedOptions = {};

  collectConfigs(
    processedOptions,
    ext.config.modules as { value: unknown; [key: string]: unknown },
    ''
  );

  // eslint-disable-next-line no-param-reassign
  ext.configEntries = processedOptions;
  // eslint-disable-next-line no-param-reassign
  ext.optionEntries = optionsCollection;
});

const result = isAllValidExtensionConfigOrder(activatedExtensions);
