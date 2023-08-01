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
} from 'hooks/jotai/globals-wrapper';
import { ExtensionsState } from 'function/global/types';

import './extension-manager.css';
import { info } from 'util/scripts/logging';

import ExtensionElement from './extension-element';
import { propagateActiveExtensionsChange } from '../helpers';
import {
  addExtensionToExplicityActivatedExtensions,
  moveExtension,
  removeExtensionFromExplicitlyActivatedExtensions,
} from './extensions-state';

export default function ExtensionManager() {
  const [extensionsState, setExtensionsState] = useExtensionStateReducer();

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const setConfigurationLocks = useSetConfigurationLocks();

  const setConfigurationDefaults = useSetConfigurationDefaults();

  const setConfiguration = useSetConfiguration();

  // currently simply reset:
  const configurationTouched = useConfigurationTouched();
  const setConfigurationTouched = useSetConfigurationTouched();
  const setConfigurationWarnings = useSetConfigurationWarnings();

  function onActiveExtensionsUpdate(exts: Extension[]) {
    // Defer here to a processor for the current list of active extensions to yield the

    const touchedOptions = Object.entries(configurationTouched).filter(
      (pair) => pair[1] === true
    );
    if (touchedOptions.length > 0) {
      window.alert(
        `WARNING: Changing the active extensions will reset your configuration`
      );
    }
  }

  const eds = new ExtensionDependencySolver(extensionsState.extensions);
  const revDeps = Object.fromEntries(
    extensionsState.extensions.map((e: Extension) => [
      e.name,
      eds.reverseDependenciesFor(e.name),
    ])
  );
  const depsFor = Object.fromEntries(
    extensionsState.extensions.map((e: Extension) => [
      e.name,
      eds
        .dependenciesFor(e.name)
        .flat()
        .filter((s) => s !== e.name),
    ])
  );
  const extensionsByName = Object.fromEntries(
    extensionsState.extensions.map((ext: Extension) => [ext.name, ext])
  );
  const extensionsByNameVersionString = Object.fromEntries(
    extensionsState.extensions.map((ext: Extension) => [
      `${ext.name}-${ext.version}`,
      ext,
    ])
  );

  const eUI = extensionsState.installedExtensions.map((ext) => (
    <ExtensionElement
      key={`${ext.name}-${ext.version}`}
      ext={ext}
      active={false}
      movability={{ up: false, down: false }}
      buttonText={t('gui-general:activate')}
      clickCallback={(event) => {
        // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

        const newExtensionState = addExtensionToExplicityActivatedExtensions(
          extensionsState,
          eds,
          extensionsByName,
          extensionsByNameVersionString,
          ext
        );

        const newActiveExtensions = newExtensionState.activeExtensions;

        onActiveExtensionsUpdate(newActiveExtensions);
        propagateActiveExtensionsChange(newActiveExtensions, {
          extensionsState,
          setExtensionsState,
          setConfiguration,
          setConfigurationDefaults,
          setConfigurationTouched,
          setConfigurationWarnings,
          setConfigurationLocks,
        });
        setExtensionsState(newExtensionState);
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
        clickCallback={(event) => {
          const newExtensionState =
            removeExtensionFromExplicitlyActivatedExtensions(
              extensionsState,
              eds,
              extensionsState.extensions,
              ext
            );
          const ae = newExtensionState.activeExtensions;
          onActiveExtensionsUpdate(ae);
          setExtensionsState(newExtensionState);
        }}
        moveCallback={(event: { name: string; type: 'up' | 'down' }) => {
          const newExtensionsState = moveExtension(extensionsState, event);

          onActiveExtensionsUpdate(newExtensionsState.activeExtensions);
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
