/* eslint-disable no-debugger */
/* eslint-disable no-console */

import { describe, expect, test } from '@jest/globals';
import YAML from 'yaml';
import {
  ConfigEntry,
  Extension,
  OptionEntry,
} from '../main/framework/config/common';
import { isValuePermitted } from '../main/framework/config/value-permissions';
import { collectConfigs } from '../main/framework/config/Config';
import {
  isValidExtensionConfigOrder,
  isAllValidExtensionConfigOrder,
} from '../main/framework/config/extension-permissions';

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
    type: 'number',
    url: 'test1.hello',
    value: {
      default: 4,
    },
  } as unknown as OptionEntry,
  [
    {
      'test1.hello': {
        url: 'test1.hello',
        value: { 'required-value': 3 },
      } as unknown as ConfigEntry,
    },
  ]
);

describe('Test 2', () => {
  test('should be illegal because of a required value mismatch', () => {
    expect(b.status).toBe('illegal');
  });
});

const test3Spec = {
  url: 'test.hello',
  type: 'number',
  value: {
    default: 0,
  },
} as unknown as OptionEntry;

const test3Configs = [
  {
    'test.hello': {
      value: {
        'suggested-value': 10,
      },
    } as unknown as ConfigEntry,
  },
];

const test3 = isValuePermitted(1, test3Spec, test3Configs);

describe('Test 3', () => {
  test('should raise a warning', () => {
    expect(test3.status).toBe('warning');
  });
});

const test4Spec = {
  value: {
    choices: ['A', 'B', 'C'],
  },
  type: 'choice',
  url: 'test4.choice1',
} as unknown as OptionEntry;
const test4Configs = [
  {
    'test4.choice1': {
      value: {
        'required-value': 'A',
      },
    } as unknown as ConfigEntry,
  },
];

const test4 = isValuePermitted('A', test4Spec, test4Configs);

describe('Test 4', () => {
  test('should be OK', () => {
    expect(test4.status).toBe('OK');
  });
});

const test4B = isValuePermitted('B', test4Spec, test4Configs);

describe('Test 4B', () => {
  test('should be illegal', () => {
    expect(test4B.status).toBe('illegal');
  });
});

const test5Spec = {
  value: {
    default: 'alpha',
  },
  type: 'string',
  url: 'test5.string1',
} as unknown as OptionEntry;
const test5Configs = [
  {
    'test5.string1': {
      value: {
        'suggested-value': 'bravo',
      },
    } as unknown as ConfigEntry,
  },
];

const test5 = isValuePermitted('charlie', test5Spec, test5Configs);

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
  test8Extensions.map((e) => e.configEntries)
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
