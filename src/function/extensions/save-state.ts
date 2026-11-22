import { Extension, ExtensionType, SaveState } from '../../config/ucp/common';
import { createExtensionID } from '../global/constants/extension-id';

/*
 * Map Extensions owns save files and decides admission when a save is loaded.
 * The launcher only reads the `save-state` declaration from definition.yml to warn
 * before a module that saved games depend on leaves the setup (docs/save-state.md).
 */

export const SAVE_STATE_VALUES: readonly SaveState[] = ['required', 'optional'];

const isSaveState = (value: unknown): value is SaveState =>
  SAVE_STATE_VALUES.includes(value as SaveState);

/**
 * Validates the raw `save-state` value of a definition.yml.
 * Returns the accepted value, or a warning when the value is present but is ignored.
 */
export function readSaveStateDeclaration(
  value: unknown,
  type: ExtensionType,
  id: string,
): { value?: SaveState; warning?: string } {
  if (value === undefined) return {};
  if (type === 'plugin')
    return {
      warning: `"save-state" in definition.yml of ${id} is ignored: plugins have no code that writes into saves`,
    };
  if (!isSaveState(value))
    return {
      warning: `Invalid save-state value ${JSON.stringify(value)} in definition.yml of ${id}; it is ignored. Use "required" or "optional"`,
    };
  return { value };
}

/** The save-state an extension declares, or undefined for plugins and undeclared modules. */
export function saveStateOf(ext: Extension): SaveState | undefined {
  if (ext.type === 'plugin') return undefined;
  const value = ext.definition?.['save-state'];
  return isSaveState(value) ? value : undefined;
}

/** Extensions that declare save-state, each exact version once, in input order. */
export function withSaveState(extensions: Extension[]) {
  const seen = new Set<string>();
  return extensions.filter((ext) => {
    if (saveStateOf(ext) === undefined) return false;
    const id = createExtensionID(ext);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Compares two setups by extension name among extensions that declare save-state.
 * A different version of the same name is neither removed nor added:
 * Map Extensions admits saves by provider id and schema, not by version.
 */
export function saveStateChanges(
  before: Extension[],
  after: Extension[],
): { removed: Extension[]; added: Extension[] } {
  const declaredBefore = withSaveState(before);
  const declaredAfter = withSaveState(after);
  const namesBefore = new Set(declaredBefore.map((ext) => ext.name));
  const namesAfter = new Set(declaredAfter.map((ext) => ext.name));
  return {
    removed: declaredBefore.filter((ext) => !namesAfter.has(ext.name)),
    added: declaredAfter.filter((ext) => !namesBefore.has(ext.name)),
  };
}
