/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
/* eslint-disable react/no-unescaped-entities */
/* global CreateUIElement */

import './config-editor.css';

import { Form } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { UCP3SerializedPluginConfig, toYaml } from 'config/ucp/config-files';
import { showModalCreatePlugin } from 'components/modals/modal-create-plugin';
import { createDir, exists, writeTextFile } from '@tauri-apps/api/fs';
import { showModalOk } from 'components/modals/modal-ok';
import { showModalOkCancel } from 'components/modals/modal-ok-cancel';
import { reloadCurrentWindow } from 'function/window-actions';

import { ConsoleLogger } from 'util/scripts/logging';
import { useAtom, useAtomValue } from 'jotai';
import {
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
} from 'function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from 'function/extensions/state/state';
import { useCurrentGameFolder } from 'function/game-folder/state';
import { makeToast } from 'components/modals/toasts/ToastsDisplay';
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

  const setConfigStatus = (msg: string) => makeToast({ title: '', body: msg });

  useEffect(() => {
    // setConfigStatus(
    //   activeExtensions.length === 0
    //     ? t('gui-editor:config.status.nothing.active', {
    //         number: activeExtensions.length,
    //       })
    //     : '',
    // );
  }, [activeExtensions, t]);

  const { nav, content } = UIFactory.CreateSections({ readonly });

  return (
    <div className="config-editor">
      {nav}
      <div className="flex-default config-container">
        <div className="parchment-box config-container__content" tabIndex={0}>
          {content}
        </div>
        {!readonly ? (
          <>
            <div className="config-editor__buttons">
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
                onClick={async () => {
                  try {
                    importButtonCallback(gameFolder, setConfigStatus, t, '');
                  } catch (e: any) {
                    await showModalOk({
                      title: 'ERROR',
                      message: e.toString(),
                    });
                  }
                }}
              />
              <ExportButton
                onClick={async () => {
                  try {
                    exportButtonCallback(gameFolder, setConfigStatus, t);
                  } catch (e: any) {
                    await showModalOk({
                      title: 'ERROR',
                      message: e.toString(),
                    });
                  }
                }}
              />
              <div className="d-none config-editor__buttons--user-override-switch">
                <Form.Switch
                  label={t('gui-editor:config.allow.override')}
                  className="user-override-switch"
                />
              </div>
              <div className="config-editor__buttons--apply-button">
                <ApplyButton
                  onClick={async () => {
                    try {
                      const result: string = await saveConfig(
                        configuration,
                        file, // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`,
                        configurationTouched,
                        extensionsState.explicitlyActivatedExtensions,
                        activeExtensions,
                        configurationQualifier,
                      );
                      setConfigStatus(result);
                    } catch (e: any) {
                      await showModalOk({
                        title: 'ERROR',
                        message: e.toString(),
                      });
                    }
                  }}
                />
                <ExportAsPluginButton
                  onClick={async () => {
                    try {
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
                        'specification-version':
                          result['specification-version'],
                      } as UCP3SerializedPluginConfig;

                      ConsoleLogger.debug(trimmedResult);

                      const r = await showModalCreatePlugin({
                        title: 'Create plugin',
                        message: '',
                      });

                      ConsoleLogger.debug(r);

                      if (r === undefined) return;

                      // const gameFolder = getStore().get(GAME_FOLDER_ATOM);

                      const pluginDir = `${gameFolder}/ucp/plugins/${r.pluginName}-${r.pluginVersion}`;

                      if (await exists(pluginDir)) {
                        await showModalOk({
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

                      const confirmed = await showModalOkCancel({
                        title: t('gui-general:require.reload.title'),
                        message: t('gui-editor:overview.require.reload.text'),
                      });

                      if (confirmed) {
                        reloadCurrentWindow();
                      }
                    } catch (e: any) {
                      await showModalOk({
                        title: 'ERROR',
                        message: e.toString(),
                      });
                    }
                  }}
                />
              </div>
            </div>

            <div className="config-warning-container">
              <div className="d-none config-warning-container__symbols">
                <span
                  className={`text-danger mx-1${
                    errorCount > 0 ? '' : ' invisible'
                  }`}
                >
                  ⚠
                </span>
                <span className="mx-1">
                  {t('gui-general:errors', { count: errorCount })}
                </span>
                <span
                  className={`text-warning mx-1${
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
          </>
        ) : null}
      </div>
    </div>
  );
}
