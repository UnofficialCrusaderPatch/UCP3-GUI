import { atom } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query';
import { atomFamily } from 'jotai/utils';
import { DEFAULT_CONTENT_STATE } from '../../../../function/content/state/content-state';
import { DEFAULT_CONTENT_INTERFACE_STATE } from '../../../../function/content/state/content-interface-state';
import { fetchStore } from '../../../../function/content/store/fetch';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { ContentElement } from '../../../../function/content/types/content-element';
import { ContentInstallationStatus } from './downloads/download-progress';
import { UCP_VERSION_ATOM } from '../../../../function/ucp-files/ucp-version';
import { STORE_SHOW_ALL_EXTENSION_TYPES_ATOM } from '../../../../function/gui-settings/settings';
import { UI_FILTER_SETTING_ATOM } from '../buttons/filter-button';
import {
  ACTIVE_EXTENSIONS_ID_ATOM,
  EXTENSIONS_ATOM,
  EXTENSIONS_STATE_TREE_ATOM,
} from '../../../../function/extensions/state/focus';
import { createExtensionID } from '../../../../function/global/constants/extension-id';
import { CONFIGURATION_DISK_STATE_ATOM } from '../../../../function/extensions/state/disk';

// eslint-disable-next-line import/prefer-default-export
export const CONTENT_STATE_ATOM = atom(DEFAULT_CONTENT_STATE);
export const CONTENT_INTERFACE_STATE_ATOM = atom(
  DEFAULT_CONTENT_INTERFACE_STATE,
);

export const LAST_CLICKED_CONTENT_ATOM = atom<ContentElement | undefined>();

export const SINGLE_CONTENT_SELECTION_ATOM = atom((get) => {
  const { selected } = get(CONTENT_INTERFACE_STATE_ATOM);

  if (selected.length < 1) return get(LAST_CLICKED_CONTENT_ATOM);

  const d = selected.at(-1);

  return d!;
});

export const CONTENT_STORE_ATOM = atomWithQuery((get) => ({
  queryKey: [
    'store',
    get(UCP_VERSION_ATOM).version.getMajorMinorPatchAsString(),
  ] as [string, string],
  queryFn: fetchStore,
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
  get(storePackagesAtom).map((ce) => createExtensionID(ce)),
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
      spIDs.indexOf(createExtensionID(e)) !== -1
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
        ? matchingStorePackage.contents.package
        : [];

    const isOnline = spIDs.indexOf(createExtensionID(e)) !== -1;

    const descriptions = [
      {
        language: 'default',
        content: e.description || '< not loaded >',
        method: 'inline',
      },
      ...(matchingStorePackage !== undefined
        ? matchingStorePackage.contents.description
        : []),
    ];

    const p = {
      definition: {
        ...e.definition,
        url: 'nonsense',
        dependencies: deps,
      },
      contents: {
        package: pack,
        description: descriptions,
      },
      online: isOnline,
      installed: true,
      extension: e,
    } as ContentElement;

    return p;
  });

  const epIDs = extensionPackages.map((ce) => createExtensionID(ce));

  return [
    // Filter out already installed elements
    ...storePackages.filter(
      (ce) => epIDs.indexOf(createExtensionID(ce)) === -1,
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

export const COMPLETED_CONTENT_ELEMENTS_ATOM = atom((get) =>
  get(CONTENT_ELEMENTS_ATOM)
    .map((ce) => createExtensionID(ce))
    .filter((id) => {
      const status = get(contentInstallationStatusAtoms(id));
      return status.action === 'complete';
    }),
);

export const BUSY_CONTENT_ELEMENTS_ATOM = atom((get) =>
  get(CONTENT_ELEMENTS_ATOM)
    .map((ce) => createExtensionID(ce))
    .filter((id) => {
      const status = get(contentInstallationStatusAtoms(id));
      return (
        status.action === 'download' ||
        status.action === 'install' ||
        status.action === 'uninstall'
      );
    }),
);

export const BUSY_CONTENT_COUNT = atom(0);
export const EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM = atom(false);

export const filteredContentElementsAtom = atom((get) =>
  get(CONTENT_ELEMENTS_ATOM)
    .filter((ce) =>
      get(UI_FILTER_SETTING_ATOM) ? ce.online && !ce.installed : true,
    )
    .filter(
      (ce) =>
        get(STORE_SHOW_ALL_EXTENSION_TYPES_ATOM).indexOf(ce.definition.type) !==
        -1,
    )
    .sort((a, b) => a.definition.name.localeCompare(b.definition.name)),
);

export const isContentInUseAtom = atom((get) =>
  get(CONTENT_ELEMENTS_ATOM).filter(
    (ce) =>
      get(ACTIVE_EXTENSIONS_ID_ATOM).indexOf(createExtensionID(ce)) !== -1 ||
      get(CONFIGURATION_DISK_STATE_ATOM)
        .map((ext) => createExtensionID(ext))
        .indexOf(createExtensionID(ce)) !== -1,
  ),
);

export const isTopLevelContentAtom = atom((get) =>
  get(CONTENT_ELEMENTS_ATOM).filter((ce) => {
    const tree = get(EXTENSIONS_STATE_TREE_ATOM);
    const extensions = get(EXTENSIONS_ATOM);
    const extOpt = extensions.filter(
      (ext) =>
        ext.name === ce.definition.name &&
        ext.version === ce.definition.version,
    );
    if (extOpt.length === 0) return true;

    return tree.reverseExtensionDependenciesFor(extOpt[0]).length === 0;
  }),
);
