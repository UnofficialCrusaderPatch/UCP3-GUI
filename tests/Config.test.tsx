/* eslint-disable no-debugger */
/* eslint-disable no-console */

import { describe, expect, test } from 'vitest';
import YAML from 'yaml';
import { ConfigEntry, Extension, OptionEntry } from '../src/config/ucp/common';
import { isValuePermitted } from '../src/config/ucp/value-permissions';
import { collectConfigs, Config } from '../src/config/ucp/config';
import {
  isValidExtensionConfigOrder,
  isAllValidExtensionConfigOrder,
} from '../src/config/ucp/extension-permissions';

describe('Test 1', () => {
  test('should fail because of a missing spec.type value', () => {
    expect(() => {
      const a = isValuePermitted(2, { url: 'test1.hello' } as OptionEntry, []);
      return a.status === 'OK';
    }).toThrow(`unrecognized type: ${undefined}`);
  });
});

const b = isValuePermitted(
  2,
  {
    name: 'test1',
    type: 'number',
    url: 'test1.hello',
    value: {
      default: 4,
    },
  } as unknown as OptionEntry,
  [
    {
      name: 'e1',
      configEntries: {
        'test1.hello': {
          url: 'test1.hello',
          value: { 'required-value': 3 },
        } as unknown as ConfigEntry,
      },
    } as unknown as Extension,
  ]
);

describe('Test 2', () => {
  test('should be illegal because of a required value mismatch', () => {
    expect(b.status).toBe('illegal');
  });
});

const test3Spec = {
  name: 'test',
  url: 'test.hello',
  type: 'number',
  value: {
    default: 0,
  },
} as unknown as OptionEntry;

const test3Extensions = [
  {
    name: 'e',
    configEntries: {
      'test.hello': {
        value: {
          'suggested-value': 10,
        },
      } as unknown as ConfigEntry,
    },
  } as unknown as Extension,
];

const test3 = isValuePermitted(1, test3Spec, test3Extensions);

describe('Test 3', () => {
  test('should raise a warning', () => {
    expect(test3.status).toBe('warning');
  });
});

const test4Spec = {
  name: 'test4',
  value: {
    choices: ['A', 'B', 'C'],
  },
  type: 'choice',
  url: 'test4.choice1',
} as unknown as OptionEntry;
const test4Extensions = [
  {
    name: 'e',
    configEntries: {
      'test4.choice1': {
        value: {
          'required-value': 'A',
        },
      } as unknown as ConfigEntry,
    },
  } as unknown as Extension,
];

const test4 = isValuePermitted('A', test4Spec, test4Extensions);

describe('Test 4', () => {
  test('should be OK', () => {
    expect(test4.status).toBe('OK');
  });
});

const test4B = isValuePermitted('B', test4Spec, test4Extensions);

describe('Test 4B', () => {
  test('should be illegal', () => {
    expect(test4B.status).toBe('illegal');
  });
});

const test5Spec = {
  name: 'test5',
  value: {
    default: 'alpha',
  },
  type: 'string',
  url: 'test5.string1',
} as unknown as OptionEntry;
const test5Extensions = [
  {
    name: 'e',
    configEntries: {
      'test5.string1': {
        value: {
          'suggested-value': 'bravo',
        },
      } as unknown as ConfigEntry,
    },
  } as unknown as Extension,
];

const test5 = isValuePermitted('charlie', test5Spec, test5Extensions);

describe('Test 5', () => {
  test('should be warning', () => {
    expect(test5.status).toBe('warning');
  });
});

const test6ConfigYaml = `
order: []
plugins: {}
modules:
  dummy_one:
    version: 0.0.1
    options:
      feature1:
        subfeature2:
          value:
            suggested-value: 100
            required-range:
              min: 0
              max: 200
  dummy_two:
    version: 0.0.2
    options:
      feature1:
        value:
          required-value: Hello world!
`;

const test6Config = YAML.parse(test6ConfigYaml);

const test6 = {};

Object.keys(test6Config.modules).forEach((module) => {
  collectConfigs(test6, test6Config.modules[module].options, module);
});

describe('Test 6: collectConfigs', () => {
  test('result should be of size 2', () => {
    expect(JSON.stringify(new Set(Object.keys(test6)))).toBe(
      JSON.stringify(
        new Set(['dummy_one.feature1.subfeature2', 'dummy_two.feature1'])
      )
    );
  });
});

const test7Extensions = [
  {
    name: 'mod1',
    configEntries: {},
    optionEntries: {
      'mod1.feature1': {
        type: 'number',
        value: {
          default: 20,
        },
        url: 'mod1.feature1',
      },
    },
  } as unknown as Extension,
  {
    name: 'mod2',
    configEntries: {},
  } as unknown as Extension,
];

// TODO: refactor extensions to a dictionary intead of a list. NO! should be a list, because of ordering...
const test7Extension = {
  name: 'test7',
  configEntries: {
    'mod1.feature1': {
      value: {
        'required-value': 30,
      },
    },
  },
} as unknown as Extension;

const test7 = isValidExtensionConfigOrder(test7Extensions, test7Extension);

describe('Test 7: isValidExtensionConfigOrder', () => {
  test('result should be of size 2', () => {
    expect(test7.status).toBe('OK');
  });
});

const test8Extensions = Array.from(test7Extensions);
test8Extensions.push(test7Extension);
test8Extensions.push({
  name: 'test8',
  configEntries: {
    'mod1.feature1': {
      value: {
        'required-value': 50,
      },
    },
  },
} as unknown as Extension);

const test8a = isValuePermitted(
  1000,
  test8Extensions[0].optionEntries['mod1.feature1'],
  test8Extensions
);

describe('Test 8a: isValuePermitted', () => {
  test('result should be illegal', () => {
    expect(test8a.status).toBe('illegal');
  });
});

const test8b = isAllValidExtensionConfigOrder(test8Extensions);

describe('Test 8b: isAllValidExtensionConfigOrder', () => {
  test('result should be CONFLICTS', () => {
    expect(test8b.status).toBe('CONFLICTS');
  });
});

const test9DummyExtensions = `
- name: test9_1
  type: module
  version: 0.0.1
  definition:
    name: test9_1
    version: 0.0.1
  ui:
    - type: number
      value:
        default: 20
      url: test9_1.mod1.feature1
  config:
    modules: {}
    plugins: {}
    order: []

`;

const test9 = new Config().parse(
  YAML.parse(test9DummyExtensions) as Extension[]
);

describe('Test 9: Config.parse', () => {
  test('result should be without errors', () => {
    expect(test9).toBeTruthy();
  });
});

test9.activateExtension('test9_1');
const test9B = test9.getValue('test9_1.mod1.feature1');

describe('Test 9: Config.getValue', () => {
  test('result should be 20', () => {
    expect(test9B).toBe(20);
  });
});

const test10DummyExtensions = `
${test9DummyExtensions}
- name: test10_1
  type: module
  version: 0.0.1
  definition:
    name: test10_1
    version: 0.0.1
  ui: []
  config:
    modules:
      test9_1:
        mod1:
          feature1:
            value:
              required-value: 40
    plugins: {}
    order: []  
`;

const test10 = new Config().parse(
  YAML.parse(test10DummyExtensions) as Extension[]
);
test10.activateExtension('test9_1');
test10.activateExtension('test10_1');

const test10Value = test10.getValue('test9_1.mod1.feature1');

describe('Test 10: Config.getValue override by config', () => {
  test('result should be 20', () => {
    expect(test10Value).toBe(40);
  });
});

const test11DummyExtensions = `
${test10DummyExtensions}
- name: test11_1
  type: module
  version: 0.0.1
  definition:
    name: test11_1
    version: 0.0.1
  ui: []
  config:
    modules:
      test9_1:
        mod1:
          feature1:
            value:
              required-value: 60
    plugins: {}
    order: []  
`;

const test11 = new Config().parse(
  YAML.parse(test11DummyExtensions) as Extension[]
);
test11.activateExtension('test9_1');
test11.activateExtension('test10_1');
// This one should error!
const test11ActivationResult = test11.activateExtension('test11_1');

describe('Test 11a: Config.getValue override: failed extension loading', () => {
  test('result should be illegal', () => {
    expect(test11ActivationResult.status !== 'OK').toBe(true);
  });
});

const test11Value = test11.getValue('test9_1.mod1.feature1');

describe('Test 11b: Config.getValue override: failed extension load', () => {
  test('result should be 40', () => {
    expect(test11Value).toBe(40);
  });
});
