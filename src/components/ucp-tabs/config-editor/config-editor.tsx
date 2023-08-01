/* eslint-disable react/no-unescaped-entities */
/* global CreateUIElement */

import { Form } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { openFileDialog, saveFileDialog } from 'tauri/tauri-dialog';
import { useTranslation } from 'react-i18next';
import { Extension } from 'config/ucp/common';
import { DependencyStatement } from 'config/ucp/dependency-statement';
import { loadConfigFromFile, saveUCPConfig } from 'config/ucp/config-files';
import {
  useConfigurationDefaultsReducer,
  useConfigurationReducer,
  useConfigurationTouchedReducer,
  useConfigurationWarningsReducer,
  useExtensionStateReducer,
  useSetConfigurationLocks,
  useUcpConfigFileValue,
} from 'hooks/jotai/globals-wrapper';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import { info } from 'util/scripts/logging';
import { UIFactory } from './ui-elements';

import './config-editor.css';
import { propagateActiveExtensionsChange } from '../helpers';

function saveConfig(
  configuration: { [key: string]: unknown },
  folder: string,
  touched: { [key: string]: boolean },
  sparseExtensions: Extension[],
  allExtensions: Extension[]
) {
  const sparseConfig = Object.fromEntries(
    Object.entries(configuration).filter(([key]) => touched[key])
  );

  const fullConfig = configuration;

  info(fullConfig);

  return saveUCPConfig(
    sparseConfig,
    fullConfig,
    sparseExtensions,
    allExtensions,
    folder
  );
}

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
              <button
                className="col-auto icons-button reset mx-1"
                type="button"
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
              <button
                className="col-auto icons-button import mx-1"
                type="button"
                onClick={async () => {
                  const result = await openFileDialog(gameFolder, [
                    {
                      name: t('gui-general:file.config'),
                      extensions: ['yml', 'yaml'],
                    },
                    { name: t('gui-general:file.all'), extensions: ['*'] },
                  ]);
                  if (result.isEmpty()) {
                    setConfigStatus(t('gui-editor:config.status.no.file'));
                  }

                  const openedConfig: {
                    status: string;
                    message: string;
                    result?: {
                      config: { [key: string]: unknown };
                      order: string[];
                    };
                  } = await loadConfigFromFile(result.get(), t);

                  if (openedConfig.status !== 'OK') {
                    setConfigStatus(
                      `${openedConfig.status}: ${openedConfig.message}`
                    );
                    return;
                  }

                  if (openedConfig.result === undefined) {
                    setConfigStatus(
                      t('gui-editor:config.status.failed.unknown')
                    );
                    return;
                  }

                  if (openedConfig.result.order.length > 0) {
                    const es: Extension[] = [];

                    // eslint-disable-next-line no-restricted-syntax
                    for (const e of openedConfig.result.order) {
                      const ds = DependencyStatement.fromString(e);
                      const options = extensions.filter(
                        (ext: Extension) =>
                          ext.name === ds.extension &&
                          ext.version === ds.version.toString()
                      );
                      if (options.length === 0) {
                        setConfigStatus(
                          t('gui-editor:config.status.missing.extension', {
                            extension: e,
                          })
                        );
                        return;
                      }
                      es.push(options[0]);
                    }

                    propagateActiveExtensionsChange(es, {
                      extensionsState,
                      setExtensionsState,
                      setConfiguration,
                      setConfigurationDefaults,
                      setConfigurationTouched,
                      setConfigurationWarnings,
                      setConfigurationLocks,
                    });
                  }

                  function findValue(
                    obj: { [key: string]: unknown },
                    url: string
                  ): unknown {
                    const dot = url.indexOf('.');
                    if (dot === -1) {
                      return obj[url];
                    }
                    const key = url.slice(0, dot);
                    const rest = url.slice(dot + 1);

                    if (obj[key] === undefined) return undefined;

                    return findValue(
                      obj[key] as { [key: string]: unknown },
                      rest
                    );
                  }

                  setConfiguration({
                    type: 'reset',
                    value: configurationDefaults,
                  });

                  console.log('opened config');
                  console.log(openedConfig.result);

                  const newConfiguration: { [key: string]: unknown } = {};
                  Object.keys(configuration).forEach((url) => {
                    const value = findValue(
                      (openedConfig.result || {}).config as {
                        [key: string]: unknown;
                      },
                      url
                    );
                    if (value !== undefined) {
                      newConfiguration[url] = value;
                    }
                  });

                  setConfiguration({
                    type: 'set-multiple',
                    value: newConfiguration,
                  });
                  setConfigurationTouched({
                    type: 'set-multiple',
                    value: Object.fromEntries(
                      Object.entries(newConfiguration).map(([key]) => [
                        key,
                        true,
                      ])
                    ),
                  });
                }}
              />
              <button
                className="col-auto icons-button export mx-1"
                type="button"
                onClick={async () => {
                  const filePathOptional = await saveFileDialog(gameFolder, [
                    {
                      name: t('gui-general:file.config'),
                      extensions: ['yml', 'yaml'],
                    },
                    { name: t('gui-general:file.all'), extensions: ['*'] },
                  ]);
                  if (filePathOptional.isEmpty()) {
                    setConfigStatus(t('gui-editor:config.status.cancelled'));
                    return;
                  }
                  let filePath = filePathOptional.get();

                  if (!filePath.endsWith('.yml')) filePath = `${filePath}.yml`;

                  saveConfig(
                    configuration,
                    filePath,
                    configurationTouched,
                    extensionsState.explicitlyActivatedExtensions,
                    activeExtensions
                  )
                    .then(() =>
                      setConfigStatus(t('gui-editor:config.status.exported'))
                    )
                    .catch((e) => {
                      throw new Error(e);
                    });
                }}
              />
              <button
                className="ucp-button-variant"
                type="button"
                onClick={() =>
                  saveConfig(
                    configuration,
                    file, // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`,
                    configurationTouched,
                    extensionsState.explicitlyActivatedExtensions,
                    activeExtensions
                  )
                }
              >
                <div className="ucp-button-variant-button-text">
                  {t('gui-general:apply')}
                </div>
              </button>
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
