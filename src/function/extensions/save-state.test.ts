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

describe('save-state declarations', () => {
  test.each([
    [ext('tunnelers', 'required'), 'required'],
    [ext('fixes', 'optional'), 'optional'],
    [ext('plain'), undefined],
    [ext('preset', 'required', '1.0.0', 'plugin'), undefined],
    [ext('odd', 'Required'), undefined],
  ])('saveStateOf(%#)', (extension, expected) => {
    expect(saveStateOf(extension)).toBe(expected);
  });

  test.each([
    ['required', 'module', { value: 'required' }],
    ['optional', 'module', { value: 'optional' }],
    [undefined, 'module', {}],
  ] as const)('accepts %j on a %s', (value, type, expected) => {
    expect(readSaveStateDeclaration(value, type, 'x-1')).toEqual(expected);
  });

  test.each([
    ['Required', 'module', 'Invalid save-state value'],
    ['yes', 'module', 'Invalid save-state value'],
    [true, 'module', 'Invalid save-state value'],
    [null, 'module', 'Invalid save-state value'],
    ['required', 'plugin', 'plugins'],
  ] as const)('drops %j on a %s with a warning', (value, type, warning) => {
    const result = readSaveStateDeclaration(value, type, 'x-1');
    expect(result.value).toBeUndefined();
    expect(result.warning).toContain(warning);
  });

  test('reports an invalid object value without serializing it', () => {
    const circular: unknown[] = [];
    circular.push(circular);
    expect(
      readSaveStateDeclaration(circular, 'module', 'fixture-1.0.0').warning,
    ).toContain('(object)');
  });

  test.each([
    ['module', 'required', 'ok', 'required'],
    ['module', 'maybe', 'warning', undefined],
    ['plugin', 'optional', 'warning', undefined],
  ])(
    'discovery of a %s declaring %s',
    async (type, value, status, expected) => {
      const result = await validateDefinition({
        path: `C:/fixture/ucp/${type}s/fixture-1.0.0`,
        getTextContents: async () =>
          `name: fixture\nversion: 1.0.0\ntype: ${type}\nsave-state: ${value}\n`,
      } as unknown as ExtensionHandle);
      expect(result.status).toBe(status);
      expect(result.content).toBeDefined();
      expect(result.content?.['save-state']).toBe(expected);
    },
  );
});

describe('saveStateChanges', () => {
  test('lists declared modules that leave or join the setup by name', () => {
    const tunnelers = ext('tunnelers', 'required');
    const fixes = ext('fixes', 'optional');
    const projectiles = ext('projectiles', 'optional');
    const plugin = ext('preset', 'required', '1.0.0', 'plugin');
    expect(
      saveStateChanges(
        [tunnelers, fixes, ext('plain'), plugin],
        [fixes, projectiles],
      ),
    ).toEqual({ removed: [tunnelers], added: [projectiles] });
  });

  test.each([
    ['a version change', ext('tunnelers', 'required', '1.1.0')],
    ['a later version without the declaration', ext('tunnelers', undefined, '2.0.0')],
  ])('%s of the same name is not a removal', (_, after) => {
    expect(
      saveStateChanges([ext('tunnelers', 'required', '1.0.0')], [after]),
    ).toEqual({ removed: [], added: [] });
  });

  test('lists each exact version once', () => {
    const tunnelers = ext('tunnelers', 'required');
    expect(withSaveState([tunnelers, { ...tunnelers }])).toEqual([tunnelers]);
  });
});
