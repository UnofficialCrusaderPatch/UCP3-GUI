import { Extension } from '../../../../config/ucp/common';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalize(path: string) {
  return path.replace(/\\/g, '/').replace(/\/+$/, '');
}

// AI Swapper stores both ordered menu selections and effective per-component
// values. Keep both representations consistent when a resource provider leaves.
// eslint-disable-next-line import/prefer-default-export
export function removeProviderAiOverrides(
  configuration: Record<string, unknown>,
  removedProviders: Extension[],
) {
  const roots = removedProviders.flatMap((ext) => {
    const directory = ext.type === 'module' ? 'modules' : 'plugins';
    return [
      `ucp/${directory}/${ext.name}/`,
      `ucp/${directory}/${ext.name}-${ext.version}/`,
      `${normalize(ext.io.path).replace(/\.zip$/, '')}/`,
    ];
  });
  const unavailable = (value: unknown) =>
    record(value) &&
    typeof value.root === 'string' &&
    roots.some((root) =>
      `${normalize(value.root as string)}/`.startsWith(root),
    );
  const result = { ...configuration };
  const menu = configuration['aiSwapper.menu'];
  if (record(menu)) {
    const filteredMenu = Object.fromEntries(
      Object.entries(menu).map(([slot, selections]) => [
        slot,
        Array.isArray(selections)
          ? selections.filter((s) => !unavailable(s))
          : selections,
      ]),
    );
    result['aiSwapper.menu'] = filteredMenu;
  }
  Object.entries(configuration).forEach(([url, value]) => {
    const match = /^aiSwapper\.ai\.([^.]+)\.([^.]+)$/.exec(url);
    if (!match || !unavailable(value)) return;
    const [, slot, component] = match;
    const remainingMenu = result['aiSwapper.menu'];
    const selections = record(remainingMenu) ? remainingMenu[slot] : undefined;
    const next = Array.isArray(selections)
      ? selections.find(
          (s) =>
            record(s) &&
            record(s.control) &&
            typeof s.control[component] === 'boolean',
        )
      : undefined;
    if (record(next) && record(next.control)) {
      result[url] = {
        name: next.name,
        root: next.root,
        language: next.language,
        active: next.control[component],
      };
    } else {
      // Removing the user value lets normal merging restore plugin/game defaults.
      delete result[url];
    }
  });
  return result;
}
