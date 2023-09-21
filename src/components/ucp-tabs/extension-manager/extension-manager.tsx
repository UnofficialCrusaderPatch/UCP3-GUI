import { Container, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  useConfigurationTouched,
  useSetConfigurationTouched,
  useConfigurationDefaultsReducer,
  useConfigurationReducer,
  useUcpConfigFileValue,
  useConfigurationQualifier,
  useExtensionState,
} from 'hooks/jotai/globals-wrapper';

import './extension-manager.css';

import { useState } from 'react';
import { useAtom } from 'jotai';
import * as GuiSettings from 'function/global/gui-settings/guiSettings';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import {
  ActiveExtensionElement,
  InactiveExtensionElement,
} from './extension-element';
import exportButtonCallback from '../common/ExportButtonCallback';
import importButtonCallback from '../common/ImportButtonCallback';
import saveConfig from '../common/SaveConfig';
import ApplyButton from '../config-editor/ApplyButton';
import ExportButton from '../config-editor/ExportButton';
import ImportButton from '../config-editor/ImportButton';
import ResetButton from '../config-editor/ResetButton';

export default function ExtensionManager() {
  const extensionsState = useExtensionState();

  console.log(
    `Extension state at start of render of ExtensionManager`,
    extensionsState
  );

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const [configuration, setConfiguration] = useConfigurationReducer();

  // currently simply reset:
  const configurationTouched = useConfigurationTouched();
  const setConfigurationTouched = useSetConfigurationTouched();
  const file = useUcpConfigFileValue();
  const { activeExtensions } = extensionsState;

  const [configStatus, setConfigStatus] = useState('');

  const configurationQualifier = useConfigurationQualifier();

  const [advancedMode] = useAtom(GuiSettings.ADVANCED_MODE_ATOM);

  const extensionsToDisplay = advancedMode
    ? extensionsState.installedExtensions
    : extensionsState.installedExtensions.filter((e) => e.type === 'plugin');

  const eUI = extensionsToDisplay.map((ext) => (
    <InactiveExtensionElement
      key={`inactive-extension-element-${ext.name}-${ext.version}`}
      ext={ext}
    />
  ));

  const displayedActiveExtensions = advancedMode
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
          </div>
        </div>
      </div>
    </Container>
  );
}
