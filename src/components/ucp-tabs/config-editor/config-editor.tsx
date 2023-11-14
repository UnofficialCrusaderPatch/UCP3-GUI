/* eslint-disable react/no-unescaped-entities */
/* global CreateUIElement */

import './config-editor.css';

import { Form } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentGameFolder } from 'hooks/jotai/helper';

import { UCP3SerializedPluginConfig, toYaml } from 'config/ucp/config-files';
import { showCreatePluginModalWindow } from 'components/modals/CreatePluginModal';
import { createDir, exists, writeTextFile } from '@tauri-apps/api/fs';
import { showGeneralModalOk } from 'components/modals/ModalOk';
import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';
import { reloadCurrentWindow } from 'function/window-actions';

import { ConsoleLogger } from 'util/scripts/logging';
import { useAtom, useAtomValue } from 'jotai';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
} from 'function/global/global-atoms';
import { UIFactory } from './ui-elements';

import ExportButton from './ExportButton';
import ApplyButton from './ApplyButton';
import ImportButton from './ImportButton';
import ResetButton from './ResetButton';
import importButtonCallback from '../common/ImportButtonCallback';
import exportButtonCallback from '../common/ExportButtonCallback';
import saveConfig from '../common/SaveConfig';
import ExportAsPluginButton from './ExportAsPluginButton';
import serializeConfig from '../common/SerializeConfig';

export default function ConfigEditor(args: { readonly: boolean }) {
  const { readonly } = args;

  const gameFolder = useCurrentGameFolder();
  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );
  const file = useAtomValue(UCP_CONFIG_FILE_ATOM);
  const configurationWarnings = useAtomValue(
    CONFIGURATION_WARNINGS_REDUCER_ATOM,
  );
  const [configuration, setConfiguration] = useAtom(CONFIGURATION_REDUCER_ATOM);
  const [configurationTouched, setConfigurationTouched] = useAtom(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);
  const { activeExtensions } = extensionsState;

  const configurationQualifier = useAtomValue(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  );

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const warningCount = Object.values(configurationWarnings)
    .map((v) => (v.level === 'warning' ? 1 : 0))
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(configurationWarnings)
    .map((v) => (v.level === 'error' ? 1 : 0))
    .reduce((a: number, b: number) => a + b, 0);

  const [configStatus, setConfigStatus] = useState('');

  useEffect(() => {
    setConfigStatus(
      activeExtensions.length === 0
        ? t('gui-editor:config.status.nothing.active', {
            number: activeExtensions.length,
          })
        : '',
    );
  }, [activeExtensions, t]);

  const { nav, content } = UIFactory.CreateSections({ readonly });

  return (
    <div id="dynamicConfigPanel" className="d-flex h-100 overflow-hidden">
      {/* Still has issues with x-Overflow */}
      <div className="col-auto">{nav}</div>
      <div className="mb-1 config-section h-100">
        <div className="m-2 container-parchment-box">
          <div className="flex-grow-1 d-flex flex-column overflow-auto parchment-box-inside parchment-box h-100">
            <div className="content-box parchment-box-item-list">{content}</div>
          </div>
        </div>
        {!readonly ? (
          <div className="row pb-2 mx-0">
            <div className="d-inline-flex">
              <ResetButton
                onClick={() => {
                  setConfiguration({
                    type: 'reset',
                    value: configurationDefaults,
                  });
                  setConfigurationTouched({
                    type: 'reset',
                    value: {},
                  });
                }}
              />
              <ImportButton
                onClick={async () =>
                  importButtonCallback(gameFolder, setConfigStatus, t, '')
                }
              />
              <ExportButton
                onClick={() =>
                  exportButtonCallback(gameFolder, setConfigStatus, t)
                }
              />
              <ApplyButton
                onClick={async () => {
                  const result: string = await saveConfig(
                    configuration,
                    file, // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`,
                    configurationTouched,
                    extensionsState.explicitlyActivatedExtensions,
                    activeExtensions,
                    configurationQualifier,
                  );

                  setConfigStatus(result);
                }}
              />
              <ExportAsPluginButton
                onClick={async () => {
                  const result = await serializeConfig(
                    configuration,
                    file, // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`,
                    configurationTouched,
                    extensionsState.explicitlyActivatedExtensions,
                    activeExtensions,
                    configurationQualifier,
                  );

                  const trimmedResult = {
                    'config-sparse': {
                      modules: result['config-sparse'].modules,
                      plugins: result['config-sparse'].plugins,
                    },
                    'specification-version': result['specification-version'],
                  } as UCP3SerializedPluginConfig;

                  ConsoleLogger.debug(trimmedResult);

                  const r = await showCreatePluginModalWindow({
                    title: 'Create plugin',
                    message: '',
                  });

                  ConsoleLogger.debug(r);

                  if (r === undefined) return;

                  // const gameFolder = getStore().get(GAME_FOLDER_ATOM);

                  const pluginDir = `${gameFolder}/ucp/plugins/${r.pluginName}-${r.pluginVersion}`;

                  if (await exists(pluginDir)) {
                    await showGeneralModalOk({
                      message: `directory already exists: ${pluginDir}`,
                      title: 'cannot create plugin',
                    });
                    return;
                  }

                  await createDir(pluginDir);

                  await writeTextFile(
                    `${pluginDir}/definition.yml`,
                    toYaml({
                      name: r.pluginName,
                      author: r.pluginAuthor,
                      version: r.pluginVersion,
                      dependencies: result['config-sparse']['load-order'],
                    }),
                  );

                  await writeTextFile(
                    `${pluginDir}/config.yml`,
                    toYaml(trimmedResult),
                  );

                  const confirmed = await showGeneralModalOkCancel({
                    title: t('gui-general:require.reload.title'),
                    message: t('gui-editor:overview.require.reload.text'),
                  });

                  if (confirmed) {
                    reloadCurrentWindow();
                  }
                }}
              />
              <Form.Switch
                id="config-allow-user-override-switch"
                label={t('gui-editor:config.allow.override')}
                className="col-auto d-inline-block ms-1 d-none"
              />
              <span className="text-warning fs-6">{configStatus}</span>
            </div>

            <div className="col-auto ml-auto d-flex justify-content-center align-items-center">
              <div
                className="d-flex justify-content-center align-items-center d-none"
                style={{ height: '0' }}
              >
                <span
                  className={`text-danger fs-4 mx-1${
                    errorCount > 0 ? '' : ' invisible'
                  }`}
                >
                  ⚠
                </span>
                <span className="mx-1">
                  {t('gui-general:errors', { count: errorCount })}
                </span>
                <span
                  className={`text-warning fs-4 mx-1${
                    errorCount > 0 ? '' : ' invisible'
                  }`}
                >
                  ⚠
                </span>
                <span className="mx-1">
                  {t('gui-general:warnings', { count: warningCount })}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
