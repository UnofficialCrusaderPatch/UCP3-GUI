import {
  ConfigFile,
  Extension,
  ConfigEntry,
  ConfigFileExtensionEntry,
} from 'config/ucp/common';
import { loadConfigFromFile } from 'config/ucp/config-files';
import { ConfigMetaObjectDB } from 'config/ucp/config-merge/objects';
import { DependencyStatement } from 'config/ucp/dependency-statement';
import { collectConfigEntries } from 'function/extensions/discovery';
import {
  ExtensionsState,
  ConfigurationQualifier,
  GeneralOkCancelModalWindow,
} from 'function/global/types';
import { openFileDialog } from 'tauri/tauri-dialog';
import { TFunction } from 'i18next';
import {
  buildExtensionConfigurationDB,
  buildConfigMetaContentDB,
} from '../extension-manager/extension-configuration';
import { createHelperObjects } from '../extension-manager/extension-helper-objects';
import { addExtensionToExplicityActivatedExtensions } from '../extension-manager/extensions-state';
import { propagateActiveExtensionsChange } from '../helpers';
import warnClearingOfConfiguration from './WarnClearingOfConfiguration';

const importButtonCallback = async (
  gameFolder: string,
  setConfigStatus: (arg0: string) => void,
  configurationTouched: { [key: string]: boolean },
  generalOkCancelModalWindow: GeneralOkCancelModalWindow,
  setGeneralOkCancelModalWindow: (
    arg0: Partial<GeneralOkCancelModalWindow>
  ) => void,
  extensionsState: ExtensionsState,
  extensions: Extension[],
  setConfiguration: (arg0: {
    type: string;
    value: { [key: string]: unknown };
  }) => void,
  setConfigurationDefaults: any,
  setConfigurationTouched: (arg0: {
    type: string;
    value: { [key: string]: boolean };
  }) => void,
  setConfigurationWarnings: any,
  setConfigurationLocks: any,
  setExtensionsState: (arg0: ExtensionsState) => void,
  setConfigurationQualifier: (arg0: {
    type: string;
    value: { [key: string]: ConfigurationQualifier };
  }) => void,
  t: TFunction<[string, string], undefined>,
  file: string | undefined
) => {
  let path = file;

  if (file === undefined || file.length === 0) {
    const pathResult = await openFileDialog(gameFolder, [
      {
        name: t('gui-general:file.config'),
        extensions: ['yml', 'yaml'],
      },
      { name: t('gui-general:file.all'), extensions: ['*'] },
    ]);
    if (pathResult.isEmpty()) {
      setConfigStatus(t('gui-editor:config.status.no.file'));
      return;
    }

    path = pathResult.get();
  }

  if (path === undefined) return;

  warnClearingOfConfiguration(configurationTouched, {
    generalOkCancelModalWindow,
    setGeneralOkCancelModalWindow,
  });

  let newExtensionsState = {
    ...extensionsState,
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
  } as ExtensionsState;

  const parsingResult: {
    status: string;
    message: string;
    result: ConfigFile;
  } = await loadConfigFromFile(path, t);

  if (parsingResult.status !== 'OK') {
    setConfigStatus(`${parsingResult.status}: ${parsingResult.message}`);
    return;
  }

  if (parsingResult.result === undefined) {
    setConfigStatus(t('gui-editor:config.status.failed.unknown'));
    return;
  }

  const config = parsingResult.result;

  const lo = config['config-sparse']['load-order'];
  if (lo !== undefined && lo.length > 0) {
    const explicitActiveExtensions: Extension[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const e of lo) {
      const ds = DependencyStatement.fromString(e);
      const options = extensions.filter(
        (ext: Extension) =>
          ext.name === ds.extension && ext.version === ds.version.toString()
      );
      if (options.length === 0) {
        setConfigStatus(
          t('gui-editor:config.status.missing.extension', {
            extension: e,
          })
        );
        return;
      }
      explicitActiveExtensions.push(options[0]);
    }

    const {
      eds,
      extensionsByName,
      extensionsByNameVersionString,
      revDeps,
      depsFor,
    } = createHelperObjects(newExtensionsState.extensions);

    explicitActiveExtensions
      .slice()
      .reverse()
      .forEach((ext) => {
        newExtensionsState = addExtensionToExplicityActivatedExtensions(
          newExtensionsState,
          eds,
          extensionsByName,
          extensionsByNameVersionString,
          ext
        );
      });

    newExtensionsState = buildExtensionConfigurationDB(newExtensionsState);
  }

  propagateActiveExtensionsChange(newExtensionsState, {
    setConfiguration,
    setConfigurationDefaults,
    setConfigurationTouched,
    setConfigurationWarnings,
    setConfigurationLocks,
  });

  setExtensionsState(newExtensionsState);

  console.log('opened config');
  console.log(parsingResult.result);

  let userConfigEntries: { [key: string]: ConfigEntry } = {};

  const parseEntry = ([extensionName, data]: [
    string,
    {
      config: ConfigFileExtensionEntry;
    }
  ]) => {
    const result = collectConfigEntries(
      data.config as {
        [key: string]: unknown;
        contents: unknown;
      },
      extensionName
    );

    userConfigEntries = { ...userConfigEntries, ...result };
  };

  Object.entries(config['config-sparse'].modules).forEach(parseEntry);
  Object.entries(config['config-sparse'].plugins).forEach(parseEntry);

  const db: ConfigMetaObjectDB = {};

  const newConfigurationQualifier: {
    [key: string]: ConfigurationQualifier;
  } = {};
  setConfigurationQualifier({
    type: 'set-multiple',
    value: {},
  });

  Object.entries(userConfigEntries).forEach(([url, data]) => {
    const m = buildConfigMetaContentDB('user', data);
    db[url] = {
      url,
      modifications: m,
    };
    // TODO: do checking here if the user part is not conflicting?

    let q = m.value.qualifier;
    if (q === 'unspecified') q = 'required';
    newConfigurationQualifier[url] = q as ConfigurationQualifier;
  });

  const newConfiguration: { [key: string]: unknown } = {};
  const newConfigurationTouched: { [key: string]: boolean } = {};

  Object.entries(db).forEach(([url, cmo]) => {
    newConfiguration[url] = cmo.modifications.value.content;
    newConfigurationTouched[url] = true;
  });

  setConfiguration({
    type: 'set-multiple',
    value: newConfiguration,
  });
  setConfigurationTouched({
    type: 'set-multiple',
    value: newConfigurationTouched,
  });
  setConfigurationQualifier({
    type: 'set-multiple',
    value: newConfigurationQualifier,
  });
};

export default importButtonCallback;
