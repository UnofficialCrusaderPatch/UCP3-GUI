import { atom } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query';
import { atomFamily } from 'jotai/utils';
import { DEFAULT_CONTENT_STATE } from '../../../../function/content/state/content-state';
import { DEFAULT_CONTENT_INTERFACE_STATE } from '../../../../function/content/state/content-interface-state';
import { dummyFetchStore } from '../../../../function/content/store/fetch';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { ContentElement } from '../../../../function/content/types/content-element';
import { ContentInstallationStatus } from './downloads/download-progress';

// eslint-disable-next-line import/prefer-default-export
export const CONTENT_STATE_ATOM = atom(DEFAULT_CONTENT_STATE);
export const CONTENT_INTERFACE_STATE_ATOM = atom(
  DEFAULT_CONTENT_INTERFACE_STATE,
);

export const SINGLE_CONTENT_SELECTION_ATOM = atom((get) => {
  const { selected } = get(CONTENT_INTERFACE_STATE_ATOM);

  if (selected.length < 1) return undefined;

  const d = selected.at(-1);

  return d!;
});

export const CONTENT_STORE_ATOM = atomWithQuery(() => ({
  queryKey: ['store'],
  queryFn: dummyFetchStore,
  retry: false,
  // staleTime: Infinity,
}));

const storePackagesAtom = atom((get) => {
  const { data } = get(CONTENT_STORE_ATOM);
  return data === undefined
    ? []
    : data.extensions.list.map(
        (ec) => ({ ...ec, online: true, installed: false }) as ContentElement,
      );
});

const spIDsAtom = atom((get) =>
  get(storePackagesAtom).map(
    (ce) => `${ce.definition.name}@${ce.definition.version}`,
  ),
);

export const CONTENT_ELEMENTS_ATOM = atom((get) => {
  const { extensions } = get(EXTENSION_STATE_INTERFACE_ATOM);

  const storePackages = get(storePackagesAtom);
  const spIDs = get(spIDsAtom);

  const extensionPackages = extensions.map((e) => {
    const deps = Object.fromEntries(
      Object.entries(e.definition.dependencies).map(([n, range]) => [
        n,
        range.raw,
      ]),
    );

    const matchingStorePackage =
      spIDs.indexOf(`${e.definition.name}@${e.definition.version}`) !== -1
        ? storePackages
            .filter(
              (ce) =>
                ce.definition.name === e.definition.name &&
                ce.definition.version === e.definition.version,
            )
            .at(0)!
        : undefined;

    const pack =
      matchingStorePackage !== undefined
        ? matchingStorePackage.sources.package
        : [];

    const isOnline =
      spIDs.indexOf(`${e.definition.name}@${e.definition.version}`) !== -1;

    const descriptions = [
      {
        language: 'default',
        content: e.description || '< not loaded >',
        method: 'inline',
      },
      ...(matchingStorePackage !== undefined
        ? matchingStorePackage.sources.description
        : []),
    ];

    const p = {
      definition: {
        ...e.definition,
        url: 'nonsense',
        dependencies: deps,
      },
      sources: {
        package: pack,
        description: descriptions,
      },
      online: isOnline,
      installed: true,
      extension: e,
    } as ContentElement;

    return p;
  });

  const epIDs = extensionPackages.map(
    (ce) => `${ce.definition.name}@${ce.definition.version}`,
  );

  return [
    // Filter out already installed elements
    ...storePackages.filter(
      (ce) =>
        epIDs.indexOf(`${ce.definition.name}@${ce.definition.version}`) === -1,
    ),
    ...extensionPackages,
  ];
});

// export const contentInstallationStatusAtoms: {
//   [id: string]: PrimitiveAtom<ContentInstallationStatus>;
// } = {};

export const contentInstallationStatusAtoms = atomFamily((id: string) =>
  atom<ContentInstallationStatus>({
    action: 'idle',
    name: id,
  }),
);
