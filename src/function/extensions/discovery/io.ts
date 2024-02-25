import yaml from 'yaml';
import { type FileEntry } from '@tauri-apps/api/fs';
import { ExtensionHandle } from '../handles/extension-handle';
import { TranslationDB, Translation } from './translation';
import { ConfigFile, Extension } from '../../../config/ucp/common';
import { renameFile } from '../../../tauri/tauri-files';
import { extractZipToPath } from '../../../tauri/tauri-invoke';
import { ZipReader } from '../../../util/structs/zip-handler';
import Logger from '../../../util/scripts/logging';

export const LOGGER = new Logger('discovery/io.ts');

export const OPTIONS_FILE = 'options.yml';
export const CONFIG_FILE = 'config.yml';
export const DEFINITION_FILE = 'definition.yml';
export const LOCALE_FOLDER = 'locale';
export const DESCRIPTION_FILE = 'description.md';

export async function readUISpec(
  eh: ExtensionHandle,
): Promise<{ options: { [key: string]: unknown }[] }> {
  if (await eh.doesEntryExist(OPTIONS_FILE)) {
    return yaml.parse(await eh.getTextContents(OPTIONS_FILE));
  }
  return { options: [] };
}
export async function readConfig(eh: ExtensionHandle): Promise<ConfigFile> {
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
export async function readLocales(
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
export async function unzipPlugins(pluginDirEnts: FileEntry[]) {
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
