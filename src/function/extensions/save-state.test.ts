import { describe, expect, test, vi } from 'vitest';
import { Extension, SaveState } from '../../config/ucp/common';
import { ExtensionHandle } from './handles/extension-handle';
import { validateDefinition } from './discovery/components/definition';
import {
  readSaveStateDeclaration,
  saveStateChanges,
  saveStateOf,
  withSaveState,
} from './save-state';

vi.mock('./discovery/system-dependencies', () => ({
  checkFrontendDependency: async () => ({ state: 'success' }),
  checkFrameworkDependency: async () => ({ state: 'success' }),
}));

function ext(
  name: string,
  saveState?: unknown,
  version = '1.0.0',
  type: 'module' | 'plugin' = 'module',
): Extension {
  return {
    name,
    version,
    type,
    definition: {
      name,
      version,
      type,
      'display-name': name,
      ...(saveState === undefined
        ? {}
        : { 'save-state': saveState as SaveState }),
    },
  } as Extension;
}

function handle(definitionYml: string, folder = 'modules'): ExtensionHandle {
  return {
    path: `C:/fixture/ucp/${folder}/fixture-1.0.0`,
    getTextContents: async () => definitionYml,
  } as unknown as ExtensionHandle;
}

describe('saveStateOf', () => {
  test('returns the declared value of a module', () => {
    expect(saveStateOf(ext('tunnelers', 'required'))).toBe('required');
    expect(saveStateOf(ext('fixes', 'optional'))).toBe('optional');
  });

  test('is undefined for undeclared modules, plugins and invalid values', () => {
    expect(saveStateOf(ext('plain'))).toBeUndefined();
    expect(
      saveStateOf(ext('preset', 'required', '1.0.0', 'plugin')),
    ).toBeUndefined();
    expect(saveStateOf(ext('odd', 'Required'))).toBeUndefined();
  });
});

describe('saveStateChanges', () => {
  test('lists declared modules that leave or join the setup by name', () => {
    const tunnelers = ext('tunnelers', 'required');
    const fixes = ext('fixes', 'optional');
    const plain = ext('plain');
    const projectiles = ext('projectiles', 'optional');
    expect(
      saveStateChanges([tunnelers, fixes, plain], [fixes, projectiles]),
    ).toEqual({ removed: [tunnelers], added: [projectiles] });
  });

  test('a version change of the same name is not a removal', () => {
    expect(
      saveStateChanges(
        [ext('tunnelers', 'required', '1.0.0')],
        [ext('tunnelers', 'required', '1.1.0')],
      ),
    ).toEqual({ removed: [], added: [] });
  });

  test('ignores plugins and undeclared modules', () => {
    const plugin = ext('preset', 'required', '1.0.0', 'plugin');
    expect(saveStateChanges([plugin, ext('plain')], [])).toEqual({
      removed: [],
      added: [],
    });
  });

  test('a later version without the declaration is not a removal', () => {
    const declared = ext('tunnelers', 'required', '1.0.0');
    expect(
      saveStateChanges([declared], [ext('tunnelers', undefined, '2.0.0')]),
    ).toEqual({ removed: [], added: [] });
  });

  test('reports an invalid object value without serializing it', () => {
    const circular: unknown[] = [];
    circular.push(circular);
    expect(
      readSaveStateDeclaration(circular, 'module', 'fixture-1.0.0').warning,
    ).toContain('(object)');
  });

  test('lists each exact version once', () => {
    const tunnelers = ext('tunnelers', 'required');
    expect(withSaveState([tunnelers, { ...tunnelers }])).toEqual([tunnelers]);
  });
});

describe('save-state in definition.yml', () => {
  test('accepts exactly required or optional on modules', () => {
    expect(readSaveStateDeclaration('required', 'module', 'x-1')).toEqual({
      value: 'required',
    });
    expect(readSaveStateDeclaration('optional', 'module', 'x-1')).toEqual({
      value: 'optional',
    });
    expect(readSaveStateDeclaration(undefined, 'module', 'x-1')).toEqual({});
  });

  test('warns about and drops invalid values', () => {
    ['Required', 'yes', true, null, 1].forEach((value) => {
      const result = readSaveStateDeclaration(value, 'module', 'x-1');
      expect(result.value).toBeUndefined();
      expect(result.warning).toContain('Invalid save-state value');
      expect(result.warning).toContain('it is ignored');
    });
  });

  test('warns about and drops a declaration on a plugin', () => {
    const result = readSaveStateDeclaration('required', 'plugin', 'x-1');
    expect(result.value).toBeUndefined();
    expect(result.warning).toContain('plugins');
  });

  test('discovery keeps a valid module declaration', async () => {
    const result = await validateDefinition(
      handle(
        'name: fixture\nversion: 1.0.0\ntype: module\nsave-state: required\n',
      ),
    );
    expect(result.status).toBe('ok');
    expect(result.content?.['save-state']).toBe('required');
  });

  test('discovery drops an invalid value with a warning', async () => {
    const result = await validateDefinition(
      handle(
        'name: fixture\nversion: 1.0.0\ntype: module\nsave-state: maybe\n',
      ),
    );
    expect(result.status).toBe('warning');
    expect(result.messages[0]).toContain('Invalid save-state value ("maybe")');
    expect(result.content).toBeDefined();
    expect(result.content).not.toHaveProperty('save-state');
  });

  test('discovery drops a plugin declaration with a warning', async () => {
    const result = await validateDefinition(
      handle(
        'name: fixture\nversion: 1.0.0\ntype: plugin\nsave-state: optional\n',
        'plugins',
      ),
    );
    expect(result.status).toBe('warning');
    expect(result.content).not.toHaveProperty('save-state');
  });
});
