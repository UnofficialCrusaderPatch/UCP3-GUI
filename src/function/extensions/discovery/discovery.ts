// eslint-disable-next-line max-classes-per-file
import { onFsExists } from '../../../tauri/tauri-files';
import {
  ConfigEntry,
  ConfigFile,
  Definition,
  Extension,
} from '../../../config/ucp/common';
import Logger from '../../../util/scripts/logging';
import { showModalOk } from '../../../components/modals/modal-ok';
import { ExtensionHandle } from '../handles/extension-handle';
import { getStore } from '../../../hooks/jotai/base';
import { AVAILABLE_LANGUAGES_ATOM } from '../../../localization/i18n';
import { collectConfigEntries } from './collect-config-entries';
import { parseConfigEntries } from './parse-config-entries';
import { readUISpec, readConfig, readLocales } from './io';
import { getExtensionHandles } from './extension-handles';
import { attachExtensionInformationToDisplayConfigElement } from './components/ui';
import { createIO } from './components/io';
import { validateDefinition } from './components/definition';
import { TranslationDB } from './translation';

export const LOGGER = new Logger('discovery.ts');

type ExtensionLoadResult = {
  status: 'ok' | 'warning' | 'error';
  messages: string[];
  content: Extension | undefined;
  handle: ExtensionHandle;
};

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

        const { name, version, type, meta, description } = definition;

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
          meta,
          description,
          name,
          version,
          type,
          definition,
          io,
          ui: [] as { [key: string]: unknown }[],
          locales: {} as TranslationDB,
          config: {} as ConfigFile,
          configEntries: {} as {
            [key: string]: ConfigEntry;
          },
        } as Extension;

        const uiRaw = await readUISpec(eh);
        ext.ui = (uiRaw || {}).options || [];

        ext.locales = await readLocales(
          eh,
          ext.name,
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

        ext.ui.forEach((v) =>
          attachExtensionInformationToDisplayConfigElement(ext, v),
        );

        eh.close();

        if (warnings.length > 0) {
          return {
            status: 'warning',
            content: ext as Extension,
            messages: warnings,
            handle: eh,
          } as ExtensionLoadResult;
        }

        return {
          status: 'ok',
          content: ext as Extension,
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

// eslint-disable-next-line import/prefer-default-export
export { Discovery, collectConfigEntries, getExtensionHandles };
