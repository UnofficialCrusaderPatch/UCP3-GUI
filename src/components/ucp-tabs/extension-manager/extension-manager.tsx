import { Container } from 'react-bootstrap';
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
} from 'hooks/jotai/globals-wrapper';
import {
  ExtensionsState,
  GeneralOkCancelModalWindow,
} from 'function/global/types';

import './extension-manager.css';
import { info } from 'util/scripts/logging';

import { tryResolveDependencies } from 'function/extensions/discovery';
import { useEffect } from 'react';
import {
  DEFAULT_OK_CANCEL_MODAL_WINDOW,
  showGeneralModalOkCancel,
} from 'components/modals/ModalOkCancel';
import ExtensionElement from './extension-element';
import { propagateActiveExtensionsChange } from '../helpers';
import {
  addExtensionToExplicityActivatedExtensions,
  moveExtension,
  removeExtensionFromExplicitlyActivatedExtensions,
} from './extensions-state';
import { buildExtensionConfigurationDB } from './extension-configuration';
import { createHelperObjects } from './extension-helper-objects';

async function warnClearingOfConfiguration(
  configurationTouched: {
    [key: string]: boolean;
  },
  modalWindow: {
    generalOkCancelModalWindow: GeneralOkCancelModalWindow;
    setGeneralOkCancelModalWindow: (arg0: GeneralOkCancelModalWindow) => void;
  }
) {
  // Defer here to a processor for the current list of active extensions to yield the

  const touchedOptions = Object.entries(configurationTouched).filter(
    (pair) => pair[1] === true
  );
  if (touchedOptions.length > 0) {
    // const confirmed = await new Promise<boolean>((resolve) => {
    //   modalWindow.setGeneralOkCancelModalWindow({
    //     ...modalWindow.generalOkCancelModalWindow,
    //     show: true,
    //     title: 'Warning',
    //     message:
    //       'Changing the active extensions will reset your configuration. Proceed anyway?',
    //     ok: 'Yes',
    //     cancel: 'No',
    //     handleAction: () => {
    //       // reloadCurrentWindow();
    //       resolve(true);
    //     },
    //     handleClose: () => {
    //       resolve(false);
    //     },
    //   });
    // });

    const confirmed = await showGeneralModalOkCancel(
      {
        title: 'Warning',
        message:
          'Changing the active extensions will reset your configuration. Proceed anyway?',
        ok: 'Yes',
        cancel: 'No',
      },
      modalWindow.setGeneralOkCancelModalWindow
    );

    return confirmed;
  }

  return true;
}

export default function ExtensionManager() {
  const [extensionsState, setExtensionsState] = useExtensionStateReducer();

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const [generalOkCancelModalWindow, setGeneralOkCancelModalWindow] =
    useGeneralOkayCancelModalWindowReducer();

  const setConfigurationLocks = useSetConfigurationLocks();

  const setConfigurationDefaults = useSetConfigurationDefaults();

  const setConfiguration = useSetConfiguration();

  // currently simply reset:
  const configurationTouched = useConfigurationTouched();
  const setConfigurationTouched = useSetConfigurationTouched();
  const setConfigurationWarnings = useSetConfigurationWarnings();

  const {
    eds,
    extensionsByName,
    extensionsByNameVersionString,
    revDeps,
    depsFor,
  } = createHelperObjects(extensionsState.extensions);

  const eUI = extensionsState.installedExtensions.map((ext) => (
    <ExtensionElement
      key={`${ext.name}-${ext.version}`}
      ext={ext}
      active={false}
      movability={{ up: false, down: false }}
      buttonText={t('gui-general:activate')}
      clickCallback={async (event) => {
        // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

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

        const newExtensionState = addExtensionToExplicityActivatedExtensions(
          extensionsState,
          eds,
          extensionsByName,
          extensionsByNameVersionString,
          ext
        );

        const res = buildExtensionConfigurationDB(newExtensionState);

        if (res.configuration.statusCode !== 0) {
          if (res.configuration.statusCode === 2) {
            const confirmed1 = await showGeneralModalOkCancel(
              {
                title: 'Error',
                message: `Invalid extension configuration. New configuration has ${res.configuration.errors.length} errors. Try to proceed anyway?`,
              },
              setGeneralOkCancelModalWindow
            );
            if (confirmed1) return;
          }
          const confirmed2 = await showGeneralModalOkCancel(
            {
              title: 'Warning',
              message: `Be warned, new configuration has ${res.configuration.warnings.length} warnings. Proceed anyway?`,
            },
            setGeneralOkCancelModalWindow
          );
          if (confirmed2) return;
        } else {
          console.log(`New configuration build without errors or warnings`);
        }

        propagateActiveExtensionsChange(res, {
          setConfiguration,
          setConfigurationDefaults,
          setConfigurationTouched,
          setConfigurationWarnings,
          setConfigurationLocks,
        });

        setExtensionsState(res);
        console.log('New extension state', res);
      }}
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

  const activated = extensionsState.activeExtensions.map((ext, index, arr) => {
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
        </div>
      </div>
    </Container>
  );
}

// eslint-disable-next-line @typescript-eslint/no-use-before-define
export { warnClearingOfConfiguration };
