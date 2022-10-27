/* eslint-disable react/no-unescaped-entities */
/* global CreateUIElement */

import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import ToggleButton from 'react-bootstrap/ToggleButton';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { Form } from 'react-bootstrap';

import React, {
  Component,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react';
import {
  open as dialogOpen,
  save as dialogSave,
  ask as dialogAsk,
} from '@tauri-apps/api/dialog';

import './ConfigEditor.css';

import { useTranslation } from 'react-i18next';
import { escape } from 'querystring';
import { GlobalState } from '../GlobalState';
import { ucpBackEnd } from '../fakeBackend';
import { UIFactory } from './factory/UIElements';
import { Extension } from '../../common/config/common';
import { DependencyStatement } from '../../common/config/DependencyStatement';

function saveConfig(
  configuration: { [key: string]: unknown },
  folder: string,
  touched: { [key: string]: boolean },
  extensions: Extension[]
) {
  const finalConfig = Object.fromEntries(
    Object.entries(configuration).filter(([key]) => touched[key])
  );

  console.log(finalConfig);

  return ucpBackEnd.saveUCPConfig(finalConfig, folder, extensions);
}

export default function ConfigEditor(args: {
  readonly: boolean;
  gameFolder: string;
}) {
  const { readonly, gameFolder } = args;
  const {
    configurationDefaults,
    file,
    configurationWarnings,
    configuration,
    setConfiguration,
    configurationTouched,
    setConfigurationTouched,
    activeExtensions,
    setActiveExtensions,
    extensions,
    extensionsState,
    setExtensionsState,
  } = useContext(GlobalState);

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const warningCount = Object.values(configurationWarnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'warning' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(configurationWarnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'error' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const [configStatus, setConfigStatus] = useState('');

  useEffect(() => {
    setConfigStatus(
      activeExtensions.length === 0
        ? `Nothing to display, no extensions are active: ${activeExtensions.length}`
        : ''
    );
  }, [activeExtensions]);

  return (
    <>
      {!readonly ? (
        <div className="row border-bottom border-light pb-2 mx-0">
          <div className="col">
            <button
              className="col-auto btn btn-primary mx-1"
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
            >
              {t('gui-general:reset')}
            </button>

            <button
              className="col-auto btn btn-primary mx-1"
              type="button"
              onClick={() =>
                saveConfig(
                  configuration,
                  file, // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`,
                  configurationTouched,
                  activeExtensions
                )
              }
            >
              {t('gui-general:apply')}
            </button>
            <button
              className="col-auto btn btn-primary mx-1"
              type="button"
              onClick={async () => {
                const result = await dialogOpen({
                  directory: false,
                  multiple: false,
                  defaultPath: gameFolder,
                  filters: [
                    { name: 'All Files', extensions: ['*'] },
                    { name: 'Config files', extensions: ['yml', 'yaml'] },
                  ],
                });

                if (result === null) {
                  setConfigStatus('No file selected');
                }

                const openedConfig: {
                  status: string;
                  message: string;
                  result?: {
                    config: { [key: string]: unknown };
                    order: string[];
                  };
                } = await ucpBackEnd.loadConfigFromFile(result as string);

                if (openedConfig.status !== 'OK') {
                  setConfigStatus(
                    `${openedConfig.status}: ${openedConfig.message}`
                  );
                  return;
                }

                if (openedConfig.result === undefined) {
                  setConfigStatus(`Failed to load config: unknown error`);
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
                        `Could not import configuration. Missing extension: ${e}`
                      );
                      return; // `Could not import configuration. Missing extension: ${e}`;
                    }
                    es.push(options[0]);
                  }

                  setActiveExtensions(es);
                  setExtensionsState({
                    allExtensions: extensionsState.allExtensions,
                    activatedExtensions: es,
                    activeExtensions: es,
                    installedExtensions: extensionsState.allExtensions.filter(
                      (e: Extension) =>
                        es
                          .map((ex: Extension) => `${ex.name}-${ex.version}`)
                          .indexOf(`${e.name}-${e.version}`) === -1
                    ),
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
                    Object.entries(newConfiguration).map(([key]) => [key, true])
                  ),
                });
              }}
            >
              {t('gui-general:import')}
            </button>
            <button
              className="col-auto btn btn-primary mx-1"
              type="button"
              onClick={async () => {
                let filePath = await dialogSave({});
                if (filePath === null || filePath === undefined) {
                  setConfigStatus('Config export cancelled');
                  return;
                }

                if (!filePath.endsWith('.yml')) filePath = `${filePath}.yml`;

                saveConfig(
                  configuration,
                  filePath,
                  configurationTouched,
                  activeExtensions
                )
                  .then(() => setConfigStatus(`Configuration exported!`))
                  .catch((e) => {
                    throw new Error(e);
                  });
              }}
            >
              {t('gui-general:export')}
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
      <div id="dynamicConfigPanel" className="row w-100 mx-0">
        <UIFactory.CreateSections readonly={readonly} />
      </div>
    </>
  );
}
