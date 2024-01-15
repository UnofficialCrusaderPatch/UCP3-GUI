import { Extension } from '../../../../config/ucp/common';

// eslint-disable-next-line import/prefer-default-export
export function filterOutExtensions<Type>(
  map: { [url: string]: Type },
  extensions: Extension[],
) {
  const extensionNames = extensions.map((e) => e.name);
  return Object.fromEntries(
    Object.entries(map).filter(
      ([url]) =>
        extensionNames.filter((name) => url.startsWith(`${name}.`)).length ===
        0,
    ),
  );
}
