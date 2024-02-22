// eslint-disable-next-line max-classes-per-file
import { type FileEntry } from '@tauri-apps/api/fs';
import yaml from 'yaml';
import { readDir, renameFile, onFsExists } from '../../../tauri/tauri-files';
import { extractZipToPath, slashify } from '../../../tauri/tauri-invoke';
import {
  ConfigFile,
  Definition,
  DisplayConfigElement,
  Extension,
  ExtensionIOCallback,
} from '../../../config/ucp/common';
import Logger from '../../../util/scripts/logging';
import { showModalOk } from '../../../components/modals/modal-ok';
import { ZipReader } from '../../../util/structs/zip-handler';
import { ExtensionHandle } from '../handles/extension-handle';
import DirectoryExtensionHandle from '../handles/directory-extension-handle';
import { changeLocale } from '../locale/locale';
import { ExtensionTree } from '../dependency-management/dependency-resolution';
import RustZipExtensionHandle from '../handles/rust-zip-extension-handle';
import {
  DefinitionMeta_1_0_0,
  parseDependencies,
} from './definition-meta-version-1.0.0/parse-definition';
import { getStore } from '../../../hooks/jotai/base';
import { AVAILABLE_LANGUAGES_ATOM } from '../../../localization/i18n';
import { collectConfigEntries } from './collect-config-entries';
import { parseConfigEntries } from './parse-config-entries';

const LOGGER = new Logger('discovery.ts');

const OPTIONS_FILE = 'options.yml';
const CONFIG_FILE = 'config.yml';
const DEFINITION_FILE = 'definition.yml';
const LOCALE_FOLDER = 'locale';
export const DESCRIPTION_FILE = 'description.md';

async function readUISpec(
  eh: ExtensionHandle,
): Promise<{ options: { [key: string]: unknown }[] }> {
  if (await eh.doesEntryExist(OPTIONS_FILE)) {
    return yaml.parse(await eh.getTextContents(OPTIONS_FILE));
  }
  return { options: [] };
}

async function readConfig(eh: ExtensionHandle): Promise<ConfigFile> {
  if (await eh.doesEntryExist(CONFIG_FILE)) {
    return yaml.parse(await eh.getTextContents(CONFIG_FILE));
  }
  return {
    meta: { version: '1.0.0' },
    'config-sparse': {
      modules: {},
      plugins: {},
      'load-order': [],
    },
  };
}

type Translation = { [key: string]: string };
type TranslationDB = { [language: string]: Translation };

async function readLocales(
  eh: ExtensionHandle,
  ext: Extension,
  locales: string[],
) {
  const translations: TranslationDB = {};

  const locFolder = await eh.doesEntryExist(`${LOCALE_FOLDER}/`);
  if (locFolder) {
    // eslint-disable-next-line no-restricted-syntax
    for (const language of locales) {
      // eslint-disable-next-line no-await-in-loop
      if (await eh.doesEntryExist(`${LOCALE_FOLDER}/${language}.yml`)) {
        const translation = yaml.parse(
          // eslint-disable-next-line no-await-in-loop
          await eh.getTextContents(`${LOCALE_FOLDER}/${language}.yml`),
        ) as Translation;

        translations[language] = Object.fromEntries(
          Object.entries(translation).map(([key, value]) => [
            key.toLowerCase(),
            value.replaceAll('&', ''),
          ]),
        );
      } else {
        LOGGER.msg(
          `No locale file found for: ${ext.name}: ${LOCALE_FOLDER}/${language}.yml`,
        ).info();
      }
    }
  }

  return translations;
}

function applyLocale(ext: Extension, locale: { [key: string]: string }) {
  const { ui } = ext;
  return ui.map((uiElement: { [key: string]: unknown }) =>
    changeLocale(locale, uiElement as { [key: string]: unknown }),
  );
}

async function unzipPlugins(pluginDirEnts: FileEntry[]) {
  const zipFiles = pluginDirEnts.filter(
    (fe) => fe.name !== undefined && fe.name.endsWith('.zip'),
  );

  await Promise.all(
    zipFiles.map(async (fe) => {
      const { path } = fe;

      let isPlugin = true;

      try {
        await ZipReader.withZipReaderDo(path, async (reader) => {
          if (!(await reader.doesEntryExist('definition.yml'))) {
            throw new Error(
              `Zip file does not contain a definition.yml, can't be a plugin: ${path}`,
            );
          }
        });
      } catch (e) {
        if (
          (e as object)
            .toString()
            .startsWith(
              `Zip file does not contain a definition.yml, can't be a plugin`,
            )
        ) {
          isPlugin = false;
        }
      }

      if (isPlugin) {
        await extractZipToPath(path, path.slice(undefined, -4));
        await renameFile(path, `${path}.backup`);
      }
    }),
  );
}

async function getExtensionHandles(ucpFolder: string) {
  const moduleDir = `${ucpFolder}/modules/`;
  const readModuleDirResult = await readDir(moduleDir);

  if (readModuleDirResult.isErr()) {
    const err = readModuleDirResult.err().get();
    if (
      (err as object)
        .toString()
        .startsWith('path not allowed on the configured scope')
    ) {
      throw Error(
        `Cannot process extensions. List of extensions will be empty. \n\n Reason: App is not allowed to access: ${moduleDir}`,
      );
    }

    readModuleDirResult.throwIfErr();

    return [];
  }

  const modDirEnts = readModuleDirResult
    .ok()
    .getOrReceive(() => []) as FileEntry[];

  const pluginDir = `${ucpFolder}/plugins/`;
  let readPluginDirResult = await readDir(pluginDir);

  if (readPluginDirResult.isErr()) {
    const err = readPluginDirResult.err().get();
    if (
      (err as object)
        .toString()
        .startsWith('path not allowed on the configured scope')
    ) {
      throw Error(
        `Cannot process extensions. List of extensions will be empty. \n\n Reason: App is not allowed to access: ${pluginDir}`,
      );
    }

    readPluginDirResult.throwIfErr();

    return [];
  }
  let pluginDirEnts = readPluginDirResult
    .ok()
    .getOrReceive(() => []) as FileEntry[];

  await unzipPlugins(pluginDirEnts);

  readPluginDirResult = await readDir(pluginDir);
  pluginDirEnts = (
    readPluginDirResult.ok().getOrReceive(() => []) as FileEntry[]
  ).filter((fe) => !fe.path.endsWith('.zip'));

  const de: FileEntry[] = [...modDirEnts, ...pluginDirEnts].filter(
    (fe) =>
      (fe.name || '').endsWith('.zip') ||
      (fe.children !== null && fe.children !== undefined),
  );
  const den = de.map((f) => f.name);
  const dirEnts = de.filter((e) => {
    // Zip files supersede folders
    // const isDirectory = e.children !== null && e.children !== undefined;
    // if (isDirectory) {
    //   const zipFileName = `${e.name}.zip`;
    //   if (den.indexOf(zipFileName) !== -1) {
    //     return false;
    //   }
    // }
    // Folders supersede zip files?
    if (e.name?.endsWith('.zip')) {
      const dirName = e.name.split('.zip')[0];
      if (den.indexOf(`${dirName}`) !== -1) {
        return false;
      }
    }
    return true;
  });

  const exts = await Promise.all(
    dirEnts.map(async (fe: FileEntry) => {
      const type = modDirEnts.indexOf(fe) === -1 ? 'plugin' : 'module';

      const folder = await slashify(
        type === 'module'
          ? `${ucpFolder}/modules/${fe.name}`
          : `${ucpFolder}/plugins/${fe.name}`,
      );

      if (fe.name !== undefined && fe.name.endsWith('.zip')) {
        // TODO: Do hash check here!
        const result = await RustZipExtensionHandle.fromPath(folder);
        return result as ExtensionHandle;
      }
      if (fe.children !== null) {
        // fe is a directory
        return new DirectoryExtensionHandle(folder) as ExtensionHandle;
      }
      throw new Error(`${folder} not a valid extension directory`);
    }),
  );

  return exts;
}

const attachExtensionInformation = (extension: Extension, obj: unknown) => {
  // This code makes the extension read only to some extent, but more importantly, by excluding .ui, it avoids recursive errors
  const { ui, ...rest } = { ...extension };
  const ext: Extension = { ...rest, ui: [] };

  const todo: unknown[] = [];
  const done: unknown[] = [];

  todo.push(obj);

  while (todo.length > 0) {
    const current = todo.pop();

    if (done.indexOf(current) !== -1) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (current instanceof Array) {
      current.forEach((v) => todo.push(v));
    } else if (current instanceof Object) {
      // Assume something is a display config element

      if ((current as DisplayConfigElement).display !== undefined) {
        const dce = current as DisplayConfigElement;

        dce.extension = ext;

        if (dce.display === 'Group' || dce.display === 'GroupBox') {
          if (dce.children !== undefined && dce.children instanceof Array) {
            // Assume it is a DisplayConfigElement
            dce.children.forEach((v) => todo.push(v));
          }
        }
      }
    } else {
      // throw Error((obj as any).toString());
    }

    done.push(current);
  }
};

type ExtensionLoadResult = {
  status: 'ok' | 'warning' | 'error';
  messages: string[];
  content: Extension | undefined;
  handle: ExtensionHandle;
};

type ExtensionDefinitionValidationResult = {
  status: 'ok' | 'warning' | 'error';
  messages: string[];
  content?: Definition;
};

const validateDefinition = async (eh: ExtensionHandle) => {
  const warnings: string[] = [];

  const inferredType =
    eh.path.indexOf('/modules/') !== -1 ? 'module' : 'plugin';
  const definition = yaml.parse(
    await eh.getTextContents(`${DEFINITION_FILE}`),
  ) as Definition;
  const { name, version } = definition;

  if (name === undefined || name === null) {
    const msg = `'name' missing in definition.yml of ${eh.path}`;
    LOGGER.msg(msg).error();

    return {
      status: 'error',
      messages: [msg],
      content: undefined,
    } as ExtensionDefinitionValidationResult;
  }

  if (version === undefined || version === null) {
    const msg = `'version' missing in definition.yml of ${eh.path}`;
    LOGGER.msg(msg).error();

    return {
      status: 'error',
      messages: [msg],
      content: undefined,
    } as ExtensionDefinitionValidationResult;
  }

  const { type } = definition;

  let assumedType = inferredType;
  if (type === undefined) {
    const warning = `"type: " was not found in definition.yml of ${name}-${version}. Extension was inferred to be a ${inferredType}`;
    LOGGER.msg(warning).warn();
  } else if (type !== inferredType) {
    const msg = `Extension type mismatch. Has a '${type}' (as found in definition.yml of ${name}-${version}) been placed in the folder for a ${inferredType}?`;
    LOGGER.msg(msg).error();

    return {
      status: 'error',
      messages: [msg],
      content: undefined,
    } as ExtensionDefinitionValidationResult;
  } else {
    assumedType = type;
  }

  const parsedDependencies = parseDependencies(
    definition as unknown as DefinitionMeta_1_0_0,
  );
  if (parsedDependencies.status !== 'ok') {
    return {
      status: 'error',
      messages: [
        `Dependencies definition of extension "${name}-${version}" is not an array of strings or a dictionary: ${JSON.stringify(
          definition.dependencies,
        )}`,
      ],
      content: undefined,
    } as ExtensionDefinitionValidationResult;
  }
  definition.dependencies = parsedDependencies.content;

  return {
    status: warnings.length === 0 ? 'ok' : 'warning',
    messages: warnings,
    content: { ...definition, type: assumedType } as Definition,
  } as ExtensionDefinitionValidationResult;
};

const createIO = (eh: ExtensionHandle) => ({
  handle: async <R>(cb: ExtensionIOCallback<R>) => {
    const neh = await eh.clone();
    try {
      return await cb(neh);
    } finally {
      neh.close();
    }
  },
  isZip: eh instanceof RustZipExtensionHandle,
  isDirectory: eh instanceof DirectoryExtensionHandle,
  path: eh.path,
});

const checkVersionEquality = (eh: ExtensionHandle, version: string) => {
  if (eh.path.toLocaleLowerCase().endsWith(`-${version}`)) {
    return true;
  }
  if (eh.path.toLocaleLowerCase().endsWith(`-${version}.zip`)) {
    return true;
  }
  if (eh.path.toLocaleLowerCase().endsWith(`-${version}/`)) {
    return true;
  }
  if (eh.path.toLocaleLowerCase().endsWith(`-${version}\\`)) {
    return true;
  }
  return false;
};

const discoverExtensions = async (gameFolder: string): Promise<Extension[]> => {
  LOGGER.msg('Discovering extensions').info();

  if (!(await onFsExists(`${gameFolder}/ucp`))) {
    return [];
  }

  const ehs = await getExtensionHandles(`${gameFolder}/ucp`);

  const extensionDiscoveryResults = await Promise.all(
    ehs.map(async (eh) => {
      const warnings: string[] = [];
      try {
        const definitionValidationResult = await validateDefinition(eh);

        if (definitionValidationResult.status === 'warning') {
          definitionValidationResult.messages.forEach((msg) =>
            warnings.push(msg),
          );
        } else if (definitionValidationResult.status === 'error') {
          return {
            status: 'error',
            messages: definitionValidationResult.messages,
            content: undefined,
            handle: eh,
          } as ExtensionLoadResult;
        }

        const definition: Definition = definitionValidationResult.content!;

        const io = createIO(eh);

        const { name, version, type } = definition;

        if (!checkVersionEquality(eh, version)) {
          return {
            status: 'error',
            messages: [
              ...warnings,
              `Version as defined in definition.yml (${version}) does not match file name version ${eh.path}`,
            ],
            content: undefined,
            handle: eh,
          } as ExtensionLoadResult;
        }

        if (definition['display-name'] === undefined) {
          definition['display-name'] = definition.name;
        }

        const ext = {
          name,
          version,
          type,
          definition,
          io,
        } as unknown as Extension;

        const uiRaw = await readUISpec(eh);
        ext.ui = (uiRaw || {}).options || [];

        ext.locales = await readLocales(
          eh,
          ext,
          Object.keys(await getStore().get(AVAILABLE_LANGUAGES_ATOM)),
        );
        ext.config = await readConfig(eh);

        const parseConfigEntriesResult = parseConfigEntries(ext.config);

        if (parseConfigEntriesResult.status !== 'ok') {
          const msg = `Warnings for config of ${ext.name}:\n${parseConfigEntriesResult.warnings.join('\n')}`;
          warnings.push(msg);
          LOGGER.msg(msg).warn();
        }

        ext.configEntries = parseConfigEntriesResult.configEntries;

        ext.ui.forEach((v) => attachExtensionInformation(ext, v));

        eh.close();

        if (warnings.length > 0) {
          return {
            status: 'warning',
            content: ext,
            messages: warnings,
            handle: eh,
          } as ExtensionLoadResult;
        }

        return {
          status: 'ok',
          content: ext,
          messages: [] as string[],
          handle: eh,
        } as ExtensionLoadResult;
      } catch (e: any) {
        LOGGER.msg(e).error();
        return {
          status: 'error',
          content: undefined,
          messages: [...warnings, e.toString()],
          handle: eh,
        } as ExtensionLoadResult;
      }
    }),
  );

  const extensionsByID: { [id: string]: Extension } = {};

  // TODO: inform the end-user of the swallowed errors
  const extensions: Extension[] = extensionDiscoveryResults
    .filter((edr) => edr.status !== 'error' && edr.content !== undefined)
    .map((edr) => edr.content) as Extension[];

  const extensionsWithErrors = extensionDiscoveryResults
    .filter((edr) => edr.status === 'error')
    .map((elr) => `${elr.handle.path}:\n${elr.messages.join('\n')}`);

  if (extensionsWithErrors.length > 0) {
    await showModalOk({
      title: 'Errors while discovering extensions',
      message: `These extensions were skipped because they contain errors:\n\n ${extensionsWithErrors.join(
        '\n\n',
      )}`,
    });
  }

  // Should not happen anymore
  extensions.forEach((e) => {
    const id = `${e.name}@${e.version}`;
    if (extensionsByID[id] !== undefined) {
      throw Error(
        `Duplicate extension detected (as per definition.yml): ${id}. Please fix the issue in the ucp folder and then refresh this GUI.`,
      );
    }
    extensionsByID[id] = e;
  });

  return extensions;
};

const Discovery = {
  discoverExtensions,
};

function tryResolveDependencies(extensions: Extension[]) {
  return new ExtensionTree(extensions).tryResolveDependencies();
}

// eslint-disable-next-line import/prefer-default-export
export {
  Discovery,
  collectConfigEntries,
  tryResolveDependencies,
  applyLocale,
  getExtensionHandles,
};
