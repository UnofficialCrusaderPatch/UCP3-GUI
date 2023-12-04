import './extension-manager.css';

import { Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import * as GuiSettings from 'function/gui-settings/settings';
import { openFileDialog, saveFileDialog } from 'tauri/tauri-dialog';
import { FileEntry, exists, readDir } from '@tauri-apps/api/fs';
import ExtensionPack from 'function/extensions/pack/extension-pack';
import { showGeneralModalOk } from 'components/modals/ModalOk';
import Logger from 'util/scripts/logging';
import {
  Funnel,
  FunnelFill,
  Gear,
  GearFill,
  PlusLg,
  Stack,
} from 'react-bootstrap-icons';
import {
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
} from 'function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from 'function/extensions/state/state';
import { ZipWriter } from 'util/structs/zip-handler';
import { useCurrentGameFolder } from 'function/game-folder/state';
import { STATUS_BAR_MESSAGE_ATOM } from 'components/footer/footer';
import {
  ActiveExtensionElement,
  ExtensionNameList,
  InactiveExtensionsElement,
} from './extension-elements/extension-element';
import exportButtonCallback from '../common/ExportButtonCallback';
import importButtonCallback from '../common/ImportButtonCallback';
import saveConfig from '../common/SaveConfig';
import ApplyButton from '../config-editor/ApplyButton';
import ExportButton from '../config-editor/ExportButton';
import ImportButton from '../config-editor/ImportButton';

const LOGGER = new Logger('CreateUIElement.tsx');

export default function ExtensionManager() {
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const configuration = useAtomValue(CONFIGURATION_REDUCER_ATOM);

  // currently simply reset:
  const configurationTouched = useAtomValue(CONFIGURATION_TOUCHED_REDUCER_ATOM);
  const file = useAtomValue(UCP_CONFIG_FILE_ATOM);
  const { activeExtensions } = extensionsState;

  const [configStatus, setConfigStatus] = useState('');

  const configurationQualifier = useAtomValue(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  );

  const [showAllExtensions, setShowAllExtensions] = useAtom(
    GuiSettings.SHOW_ALL_EXTENSIONS_ATOM,
  );

  const [advancedMode, setAdvancedMode] = useAtom(
    GuiSettings.ADVANCED_MODE_ATOM,
  );

  const extensionsToDisplay = showAllExtensions
    ? extensionsState.installedExtensions
    : extensionsState.installedExtensions.filter((e) => e.type === 'plugin');

  const extensionsToDisplayByName = Array.from(
    new Set(extensionsToDisplay.map((e) => e.name)),
  ).map(
    (n) =>
      ({
        name: n,
        extensions: extensionsState.extensions.filter((e) => e.name === n),
      }) as ExtensionNameList,
  );
  const eUI = extensionsToDisplayByName.map((enl) => (
    <InactiveExtensionsElement
      key={`inactive-extension-element-${enl.name}`}
      exts={enl.extensions}
    />
  ));

  const displayedActiveExtensions = showAllExtensions
    ? extensionsState.activeExtensions
    : extensionsState.activeExtensions.filter((e) => e.type === 'plugin');

  const activated = displayedActiveExtensions.map((ext, index, arr) => (
    <ActiveExtensionElement
      key={`active-extension-element-${ext.name}-${ext.version}`}
      ext={ext}
      index={index}
      arr={arr}
    />
  ));

  const gameFolder = useCurrentGameFolder();

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  return (
    <div className="flex-default extension-manager">
      <div className="extension-manager-control">
        <div className="extension-manager-control__header-container">
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              {t('gui-editor:extensions.available')}
            </h4>
            <div className="extension-manager-control__box__header__buttons">
              {!showAllExtensions ? (
                <span className="fs-8">{`filtered: ${
                  extensionsState.extensions.length - extensionsToDisplay.length
                } out of ${extensionsState.extensions.length}`}</span>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="ucp-button ucp-button--square text-light"
                onClick={() => {
                  setShowAllExtensions(!showAllExtensions);
                }}
                onMouseEnter={() => {
                  setStatusBarMessage('Show all extensions / Hide modules');
                }}
                onMouseLeave={() => {
                  setStatusBarMessage(undefined);
                }}
              >
                {showAllExtensions ? <Funnel /> : <FunnelFill />}
              </button>
              <button
                type="button"
                className="ucp-button ucp-button--square text-light"
                onClick={async () => {
                  try {
                    const result = await openFileDialog(gameFolder, [
                      { name: 'Zip files', extensions: ['zip'] },
                    ]);
                    if (result.isPresent()) {
                      const path = result.get();

                      LOGGER.msg(
                        `Trying to install extensions from: ${path}`,
                      ).info();

                      if (await exists(path)) {
                        try {
                          const ep = await ExtensionPack.fromPath(path);

                          try {
                            await ep.install(`${gameFolder}/ucp`);
                            await showGeneralModalOk({
                              title: 'Succesful install',
                              message: `Extension pack was succesfully installed`,
                            });
                          } catch (e) {
                            let msg = e;
                            if (typeof e === 'string') {
                              msg = e.toString(); // works, `e` narrowed to string
                            } else if (e instanceof Error) {
                              msg = e.message; // works, `e` narrowed to Error
                            }
                            await showGeneralModalOk({
                              title: 'ERROR',
                              message: (msg as string).toString(),
                            });
                          } finally {
                            await ep.close();
                          }
                        } catch (e) {
                          let msg = e;
                          if (typeof e === 'string') {
                            msg = e.toString(); // works, `e` narrowed to string
                          } else if (e instanceof Error) {
                            msg = e.message; // works, `e` narrowed to Error
                          }
                          await showGeneralModalOk({
                            title: 'ERROR',
                            message: (msg as string).toString(),
                          });
                        }
                      } else {
                        LOGGER.msg(`Path does not exist: ${path}`).warn();
                        await showGeneralModalOk({
                          title: 'Path does not exist',
                          message: `Path does not exist: ${path}`,
                        });
                      }
                    }
                  } catch (e: any) {
                    await showGeneralModalOk({
                      title: 'ERROR',
                      message: e.toString(),
                    });
                  }
                }}
                onMouseEnter={() => {
                  setStatusBarMessage(
                    'Install extensions from a pack (a zip file)',
                  );
                }}
                onMouseLeave={() => {
                  setStatusBarMessage(undefined);
                }}
              >
                <PlusLg />
              </button>
            </div>
          </div>
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              {t('gui-editor:extensions.activated')}
            </h4>
          </div>
        </div>
        <div className="extension-manager-control__box-container">
          <div className="extension-manager-control__box">
            <div className="parchment-box extension-manager-list">{eUI}</div>
          </div>
          <div className="extension-manager-control__box">
            <div className="parchment-box extension-manager-list">
              {activated}
            </div>
            <div className="extension-manager-control__box__buttons">
              <button
                type="button"
                className="ucp-button ucp-button--square text-light"
                onClick={async () => {
                  try {
                    LOGGER.msg('Creating modpack').trace();

                    const filePathResult = await saveFileDialog(
                      `${gameFolder}`,
                      [{ name: 'Zip file', extensions: ['*.zip'] }],
                      'Save pack as...',
                    );

                    if (filePathResult.isEmpty()) return;

                    const filePath = filePathResult.get();

                    const zw: ZipWriter = await ZipWriter.open(filePath);
                    try {
                      zw.addDirectory('modules');
                      zw.addDirectory('plugins');
                      // eslint-disable-next-line no-restricted-syntax
                      for (const ext of extensionsState.activeExtensions) {
                        const fpath = `${ext.name}-${ext.version}`;
                        const pathPrefix = `${gameFolder}/ucp/`;
                        let originalPath = '';
                        if (ext.type === 'plugin') {
                          originalPath = `${gameFolder}/ucp/plugins/${fpath}`;
                          const dstPath = `plugins/${fpath}`;
                          // eslint-disable-next-line no-await-in-loop
                          const touch = await exists(originalPath);

                          if (!touch) {
                            // eslint-disable-next-line no-await-in-loop
                            await showGeneralModalOk({
                              title: 'Error',
                              message: `Path does not exist: ${originalPath}`,
                            });
                            return;
                          }

                          const makeRelative = (fe: FileEntry) => {
                            if (!fe.path.startsWith(pathPrefix)) {
                              throw Error(fe.path);
                            }

                            return fe.path.substring(pathPrefix.length);
                          };

                          // eslint-disable-next-line no-await-in-loop
                          const entries = await readDir(originalPath, {
                            recursive: true,
                          });

                          const dirs = entries
                            .filter(
                              (fe) =>
                                fe.children !== undefined &&
                                fe.children !== null,
                            )
                            .map(makeRelative);

                          // eslint-disable-next-line no-restricted-syntax
                          for (const dir of dirs) {
                            // eslint-disable-next-line no-await-in-loop
                            await zw.addDirectory(dir);
                          }

                          const files = entries.filter(
                            (fe) =>
                              fe.children === undefined || fe.children === null,
                          );

                          // eslint-disable-next-line no-restricted-syntax
                          for (const fe of files) {
                            // eslint-disable-next-line no-await-in-loop
                            await zw.writeEntryFromFile(
                              makeRelative(fe),
                              fe.path,
                            );
                          }
                        } else if (ext.type === 'module') {
                          originalPath = `${gameFolder}/ucp/modules/${fpath}.zip`;
                          const dstPath = `modules/${fpath}.zip`;

                          // eslint-disable-next-line no-await-in-loop
                          const touch = await exists(originalPath);

                          if (!touch) {
                            // eslint-disable-next-line no-await-in-loop
                            await showGeneralModalOk({
                              title: 'Error',
                              message: `Path does not exist: ${originalPath}`,
                            });
                            return;
                          }

                          // eslint-disable-next-line no-await-in-loop
                          await zw.writeEntryFromFile(dstPath, originalPath);
                        } else {
                          throw Error('What are we doing here?');
                        }
                      }
                    } catch (e) {
                      LOGGER.obj(e).error();
                      await showGeneralModalOk({
                        title: 'Error',
                        message: (e as Error).toString(),
                      });
                    } finally {
                      zw.close();
                    }
                  } catch (e: any) {
                    await showGeneralModalOk({
                      title: 'ERROR',
                      message: e.toString(),
                    });
                  }
                }}
                onMouseEnter={() => {
                  setStatusBarMessage(
                    'Zip the current extensions to a zip file for sharing',
                  );
                }}
                onMouseLeave={() => {
                  setStatusBarMessage(undefined);
                }}
              >
                <Stack />
              </button>
              <ImportButton
                onClick={async () => {
                  try {
                    importButtonCallback(gameFolder, setConfigStatus, t, '');
                  } catch (e: any) {
                    await showGeneralModalOk({
                      title: 'ERROR',
                      message: e.toString(),
                    });
                  }
                }}
                onMouseEnter={() => {
                  setStatusBarMessage(
                    'Import a config file, overwriting the current configuration',
                  );
                }}
                onMouseLeave={() => {
                  setStatusBarMessage(undefined);
                }}
              />
              <ExportButton
                onClick={async () => {
                  try {
                    exportButtonCallback(gameFolder, setConfigStatus, t);
                  } catch (e: any) {
                    await showGeneralModalOk({
                      title: 'ERROR',
                      message: e.toString(),
                    });
                  }
                }}
                onMouseEnter={() => {
                  setStatusBarMessage(
                    'Export the current configuration to a file',
                  );
                }}
                onMouseLeave={() => {
                  setStatusBarMessage(undefined);
                }}
              />
              <button
                type="button"
                className="ucp-button ucp-button--square text-light"
                onClick={() => {
                  setAdvancedMode(!advancedMode);
                }}
                onMouseEnter={() => {
                  setStatusBarMessage('Customize configuration options');
                }}
                onMouseLeave={() => {
                  setStatusBarMessage(undefined);
                }}
              >
                {advancedMode ? <GearFill /> : <Gear />}
              </button>
              <div className="d-none extension-manager-control__box__buttons--user-override-switch">
                <Form.Switch
                  label={t('gui-editor:config.allow.override')}
                  className="user-override-switch"
                />
              </div>
              <div className="extension-manager-control__box__buttons--apply-button">
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
                      await showGeneralModalOk({
                        title: 'ERROR',
                        message: e.toString(),
                      });
                    }
                  }}
                  onMouseEnter={() => {
                    setStatusBarMessage(
                      'Apply the current configuration (save to ucp-config.yml)',
                    );
                  }}
                  onMouseLeave={() => {
                    setStatusBarMessage(undefined);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="extension-text-warning-container text-warning">
        {configStatus}
      </div>
    </div>
  );
}
