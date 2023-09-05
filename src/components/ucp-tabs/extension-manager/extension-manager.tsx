import { Container, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Extension } from 'config/ucp/common';
import ExtensionDependencySolver from 'config/ucp/extension-dependency-solver';
import {
  useSetConfigurationDefaults,
  useSetConfigurationLocks,
  useConfigurationTouched,
  useExtensionStateReducer,
  useSetConfiguration,
  useSetConfigurationTouched,
  useSetConfigurationWarnings,
  useGeneralOkayCancelModalWindowReducer,
  useConfigurationDefaultsReducer,
  useConfigurationReducer,
  useConfigurationQualifierReducer,
  useConfigurationTouchedReducer,
  useConfigurationWarningsReducer,
  useUcpConfigFileValue,
} from 'hooks/jotai/globals-wrapper';
import {
  ExtensionsState,
  GeneralOkCancelModalWindow,
} from 'function/global/types';

import './extension-manager.css';
import { info } from 'util/scripts/logging';

import { tryResolveDependencies } from 'function/extensions/discovery';
import { useEffect, useState } from 'react';
import {
  DEFAULT_OK_CANCEL_MODAL_WINDOW,
  showGeneralModalOkCancel,
} from 'components/modals/ModalOkCancel';
import { useAtom } from 'jotai';
import { GUI_SETTINGS_REDUCER_ATOM } from 'function/global/global-atoms';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import ExtensionElement from './extension-element';
import { propagateActiveExtensionsChange } from '../helpers';
import {
  addExtensionToExplicityActivatedExtensions,
  moveExtension,
  removeExtensionFromExplicitlyActivatedExtensions,
} from './extensions-state';
import { buildExtensionConfigurationDB } from './extension-configuration';
import { createHelperObjects } from './extension-helper-objects';
import exportButtonCallback from '../common/ExportButtonCallback';
import importButtonCallback from '../common/ImportButtonCallback';
import saveConfig from '../common/SaveConfig';
import ApplyButton from '../config-editor/ApplyButton';
import ExportButton from '../config-editor/ExportButton';
import ImportButton from '../config-editor/ImportButton';
import ResetButton from '../config-editor/ResetButton';
import warnClearingOfConfiguration from '../common/WarnClearingOfConfiguration';
import inactiveExtensionElementClickCallback from './InactiveExtensionElementClickCallback';

export default function ExtensionManager() {
  const [extensionsState, setExtensionsState] = useExtensionStateReducer();

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const [generalOkCancelModalWindow, setGeneralOkCancelModalWindow] =
    useGeneralOkayCancelModalWindowReducer();

  const setConfigurationLocks = useSetConfigurationLocks();

  const setConfigurationDefaults = useSetConfigurationDefaults();

  const [configuration, setConfiguration] = useConfigurationReducer();

  // currently simply reset:
  const configurationTouched = useConfigurationTouched();
  const setConfigurationTouched = useSetConfigurationTouched();
  const setConfigurationWarnings = useSetConfigurationWarnings();
  const file = useUcpConfigFileValue();
  const { activeExtensions } = extensionsState;
  const { extensions } = extensionsState;

  const [configStatus, setConfigStatus] = useState('');

  const [configurationQualifier, setConfigurationQualifier] =
    useConfigurationQualifierReducer();

  const {
    eds,
    extensionsByName,
    extensionsByNameVersionString,
    revDeps,
    depsFor,
  } = createHelperObjects(extensionsState.extensions);

  const [guiSettings] = useAtom(GUI_SETTINGS_REDUCER_ATOM);

  const extensionsToDisplay = guiSettings.advancedMode
    ? extensionsState.installedExtensions
    : extensionsState.installedExtensions.filter((e) => e.type === 'plugin');

  const eUI = extensionsToDisplay.map((ext) => (
    <ExtensionElement
      key={`${ext.name}-${ext.version}`}
      ext={ext}
      active={false}
      movability={{ up: false, down: false }}
      buttonText={t('gui-general:activate')}
      clickCallback={(event) =>
        inactiveExtensionElementClickCallback(
          configurationTouched,
          generalOkCancelModalWindow,
          setGeneralOkCancelModalWindow,
          extensionsState,
          eds,
          extensionsByName,
          extensionsByNameVersionString,
          ext,
          setExtensionsState,
          setConfiguration,
          setConfigurationDefaults,
          setConfigurationTouched,
          setConfigurationWarnings,
          setConfigurationLocks
        )
      }
      moveCallback={(event: { type: 'up' | 'down' }) => {}}
      revDeps={revDeps[ext.name].filter(
        (e: string) =>
          extensionsState.activeExtensions
            .flat()
            .map((ex: Extension) => ex.name)
            .indexOf(e) !== -1
      )}
    />
  ));

  const displayedActiveExtensions = guiSettings.advancedMode
    ? extensionsState.activeExtensions
    : extensionsState.activeExtensions.filter((e) => e.type === 'plugin');
  const activated = displayedActiveExtensions.map((ext, index, arr) => {
    const movability = {
      up: index > 0 && revDeps[ext.name].indexOf(arr[index - 1].name) === -1,
      down:
        index < arr.length - 1 &&
        depsFor[ext.name].indexOf(arr[index + 1].name) === -1,
    };
    return (
      <ExtensionElement
        key={`${ext.name}-${ext.version}`}
        ext={ext}
        active
        movability={movability}
        buttonText={t('gui-general:deactivate')}
        clickCallback={async (event) => {
          const confirmed = await warnClearingOfConfiguration(
            configurationTouched,
            {
              generalOkCancelModalWindow,
              setGeneralOkCancelModalWindow,
            }
          );
          if (!confirmed) {
            return;
          }
          const newExtensionState =
            removeExtensionFromExplicitlyActivatedExtensions(
              extensionsState,
              eds,
              extensionsState.extensions,
              ext
            );
          const ae = newExtensionState.activeExtensions;

          setExtensionsState(newExtensionState);
        }}
        moveCallback={async (event: { name: string; type: 'up' | 'down' }) => {
          const confirmed = await warnClearingOfConfiguration(
            configurationTouched,
            {
              generalOkCancelModalWindow,
              setGeneralOkCancelModalWindow,
            }
          );
          if (!confirmed) {
            return;
          }

          const newExtensionsState = moveExtension(extensionsState, event);

          setExtensionsState(newExtensionsState);
        }}
        revDeps={revDeps[ext.name].filter(
          (e: string) =>
            extensionsState.activeExtensions
              .map((ex: Extension) => ex.name)
              .indexOf(e) !== -1
        )}
      />
    );
  });

  const [configurationDefaults] = useConfigurationDefaultsReducer();
  const gameFolder = useCurrentGameFolder();

  return (
    <Container className="fs-6 h-100 vertical-container">
      <div className="row h-100">
        <div className="col-md-4 float-leftpt-2 w-50 h-100 d-flex flex-column overflow-hidden">
          <div>
            <h4>{t('gui-editor:extensions.available')}</h4>
          </div>
          <div className="parchment-box-inside flex-grow-1 parchment-box d-flex flex-column overflow-auto">
            <div className="parchment-box-item-list"> {eUI} </div>
          </div>
        </div>
        <div className="col-md-4 float-leftpt-2 w-50 h-100 d-flex flex-column overflow-hidden">
          <div>
            <h4>{t('gui-editor:extensions.activated')}</h4>
          </div>
          <div className="parchment-box-inside flex-grow-1 parchment-box d-flex flex-column overflow-auto">
            <div className="parchment-box-item-list">{activated}</div>
          </div>
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
                  importButtonCallback(
                    gameFolder,
                    setConfigStatus,
                    configurationTouched,
                    generalOkCancelModalWindow,
                    setGeneralOkCancelModalWindow,
                    extensionsState,
                    extensions,
                    setConfiguration,
                    setConfigurationDefaults,
                    setConfigurationTouched,
                    setConfigurationWarnings,
                    setConfigurationLocks,
                    setExtensionsState,
                    setConfigurationQualifier,
                    t,
                    ''
                  )
                }
              />
              <ExportButton
                onClick={() =>
                  exportButtonCallback(
                    gameFolder,
                    setConfigStatus,
                    configuration,
                    configurationTouched,
                    extensionsState,
                    activeExtensions,
                    configurationQualifier,
                    t
                  )
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
          </div>
        </div>
      </div>
    </Container>
  );
}
