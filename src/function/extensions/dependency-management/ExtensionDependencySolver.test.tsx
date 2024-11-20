import { afterEach, describe, expect, test } from 'vitest';
import YAML from 'yaml';
import { clearMocks } from '@tauri-apps/api/mocks';
import { Extension } from 'config/ucp/common';
import semver from 'semver';
import { ExtensionDependencyTree } from './dependency-resolution';

afterEach(() => {
  clearMocks();
});

type SerializedExtensionList = {
  name: string;
  version: string;
  definition: {
    dependencies: { [name: string]: semver.Range };
  };
}[];

describe('Test 1: Dependency order solving', () => {
  test('result should be ?', () => {
    const test1Yaml = `
- name: extension1
  version: 1.0.0
  definition:
    dependencies:
      extension6: 1.0.0
- name: extension2
  version: 1.0.0
  definition:
    dependencies: {}
- name: extension3
  version: 1.0.0
  definition:
    dependencies:
      extension2: 1.0.0
- name: extension4
  version: 1.0.0
  definition:
    dependencies:
      extension3: 1.0.0
      extension1: 1.0.0
- name: extension5
  version: 1.0.0
  definition:
    dependencies:
      extension2: 1.0.0
- name: extension6
  version: 1.0.0
  definition:
    dependencies:
      extension5: 1.0.0
`;

    const extensions: Extension[] = (
      YAML.parse(test1Yaml) as SerializedExtensionList
    ).map((entry) => {
      // eslint-disable-next-line no-param-reassign
      entry.definition.dependencies = Object.fromEntries(
        Object.entries(entry.definition.dependencies).map(([name, v]) => [
          name,
          new semver.Range(v, { loose: true }),
        ]),
      );

      return entry;
    }) as unknown as Extension[];

    const edt = new ExtensionDependencyTree(extensions, '1.0.6', '3.0.4');
    const solution = edt.tryResolveAllDependencies();

    expect(solution.status === 'ok');

    if (solution.status === 'ok') {
      expect(
        edt.dependenciesFor('extension4@1.0.0').packages.map((p) => p.id),
      ).toEqual([
        'extension2@1.0.0',
        'extension3@1.0.0',
        'extension5@1.0.0',
        'extension6@1.0.0',
        'extension1@1.0.0',
        'extension4@1.0.0',
      ]);
    }
  });
});
