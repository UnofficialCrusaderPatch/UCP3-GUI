import { atomWithStorage } from 'jotai/utils';

// See:  https://jotai.org/docs/utilities/storage
// The below code would set up the storage to a certain file in the GUI's AppData directory.
// const storage: FileBackedStorage = new FileBackedStorage('guiSettings.json');

export const SHOW_ALL_EXTENSIONS_ATOM = atomWithStorage(
  'guiShowAllExtensions',
  true,
);
export const ADVANCED_MODE_ATOM = atomWithStorage('guiAdvancedMode', false);
export const RECENT_FOLDERS_ATOM = atomWithStorage(
  'guiRecentFolders',
  [] as string[],
); // Or whatever it currently is! Is current folder just the most recent? Or do we need a currentFolder field too?
export const LANGUAGE_ATOM = atomWithStorage('guiLanguage', 'en'); // Any other language we support

// From here on, I am speculating on what we could need
export const THEME_ATOM = atomWithStorage('guiTheme', 'default'); // If we ever implement theming

export type CodeBranch = 'release-only' | 'pre-release';

// If developers want the latest fixes and features before they are released to everyone
export const GUI_BRANCH_ATOM = atomWithStorage(
  'guiBranch',
  'release-only' as CodeBranch,
);

//
export const UCP_BRANCH_ATOM = atomWithStorage(
  'ucpBranch',
  'release-only' as CodeBranch,
);

// Config specific settings

// For the advanced users who get tired of warnings popping up.
// This isn't impemented, I am just thinking of things we might have in the future
// Since warnings don't hamper config saving anyway, it could also be called 'hideWarnings'
export const CONFIG_IGNORE_WARNINGS = atomWithStorage(
  'configMerging.ignoreWarnings',
  false,
);

// For the expert users that want to override all errors. They do hamper applying a config, so this is a true expert override
// This should actually be more clever, like: "don't count X as an error", rather than "ignore all merge errors"..
export const CONFIG_IGNORE_ERRORS = atomWithStorage(
  'configMerging.ignoreErrors',
  false,
);
