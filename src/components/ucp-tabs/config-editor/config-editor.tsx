/* eslint-disable react/no-unescaped-entities */
/* global CreateUIElement */

import { Form } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { openFileDialog, saveFileDialog } from 'tauri/tauri-dialog';
import { useTranslation } from 'react-i18next';
import {
  ConfigEntry,
  ConfigFile,
  ConfigFileExtensionEntry,
  Extension,
} from 'config/ucp/common';
import { DependencyStatement } from 'config/ucp/dependency-statement';
import { loadConfigFromFile, saveUCPConfig } from 'config/ucp/config-files';
import {
  useConfigurationDefaultsReducer,
  useConfigurationQualifierReducer,
  useConfigurationReducer,
  useConfigurationTouchedReducer,
  useConfigurationWarningsReducer,
  useExtensionStateReducer,
  useGeneralOkayCancelModalWindowReducer,
  useSetConfigurationLocks,
  useUcpConfigFileValue,
} from 'hooks/jotai/globals-wrapper';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import { info } from 'util/scripts/logging';
import { ConfigurationQualifier, ExtensionsState } from 'function/global/types';
import { collectConfigEntries } from 'function/extensions/discovery';
import {
  ConfigMetaContentDB,
  ConfigMetaObjectDB,
} from 'config/ucp/config-merge/objects';
import {
  buildConfigMetaContent,
  buildConfigMetaContentDB,
  buildExtensionConfigurationDB,
} from '../extension-manager/extension-configuration';

import { UIFactory } from './ui-elements';

import './config-editor.css';
import { propagateActiveExtensionsChange } from '../helpers';
import { addExtensionToExplicityActivatedExtensions } from '../extension-manager/extensions-state';
import { createHelperObjects } from '../extension-manager/extension-helper-objects';
import ExportButton from './ExportButton';
import ApplyButton from './ApplyButton';
import ImportButton from './ImportButton';
import ResetButton from './ResetButton';
import importButtonCallback from '../common/ImportButtonCallback';
import exportButtonCallback from '../common/ExportButtonCallback';
import saveConfig from '../common/SaveConfig';

export default function ConfigEditor(args: { readonly: boolean }) {
  const { readonly } = args;

  const gameFolder = useCurrentGameFolder();
  const [configurationDefaults, setConfigurationDefaults] =
    useConfigurationDefaultsReducer();
  const file = useUcpConfigFileValue();
  const [configurationWarnings, setConfigurationWarnings] =
    useConfigurationWarningsReducer();
  const [configuration, setConfiguration] = useConfigurationReducer();
  const [configurationTouched, setConfigurationTouched] =
    useConfigurationTouchedReducer();
  const [extensionsState, setExtensionsState] = useExtensionStateReducer();
  const { activeExtensions } = extensionsState;
  const { extensions } = extensionsState;
  const setConfigurationLocks = useSetConfigurationLocks();

  const [configurationQualifier, setConfigurationQualifier] =
    useConfigurationQualifierReducer();

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
        : ''
    );
  }, [activeExtensions, t]);

  const { nav, content } = UIFactory.CreateSections({ readonly });

  const [generalOkCancelModalWindow, setGeneralOkCancelModalWindow] =
    useGeneralOkayCancelModalWindowReducer();

  return (
    <div id="dynamicConfigPanel" className="d-flex h-100 overflow-hidden">
      {/* Still has issues with x-Overflow */}
      <div className="col-auto">{nav}</div>
      <div className="mb-1 config-section h-100">
        <div className="m-2 container-parchment-box">
          <div className="flex-grow-1 d-flex flex-column overflow-auto parchment-box-inside parchment-box ">
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
                    configurationQualifier
                  );

                  setConfigStatus(result);
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
