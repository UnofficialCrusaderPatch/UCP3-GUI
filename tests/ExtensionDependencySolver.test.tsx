import { describe, expect, test } from 'vitest';
import YAML from 'yaml';
import ExtensionDependencySolver from '../src/config/ucp/extension-dependency-solver';

const test1Yaml = `
- name: extension1
  definition:
   dependencies: [extension6]
- name: extension2
  definition:
    dependencies: []
- name: extension3
  definition:
    dependencies: [extension2]
- name: extension4
  definition:
    dependencies: [extension3, extension1]
- name: extension5
  definition:
    dependencies: [extension2]
- name: extension6
  definition:
    dependencies: [extension5]
`;

const test1 = new ExtensionDependencySolver(YAML.parse(test1Yaml)).solve();

describe('Test 1: Dependency order solving', () => {
  test('result should be ?', () => {
    expect(test1).toEqual([
      ['extension2'],
      ['extension3', 'extension5'],
      ['extension6'],
      ['extension1'],
      ['extension4'],
    ]);
  });
});
