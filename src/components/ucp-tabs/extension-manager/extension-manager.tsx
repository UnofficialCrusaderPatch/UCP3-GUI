import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import {
  Button,
  Col,
  Container,
  ListGroup,
  Row,
  Tooltip,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Extension } from 'config/ucp/common';
import ExtensionDependencySolver from 'config/ucp/extension-dependency-solver';
import {
  useConfigurationDefaults,
  useConfigurationDefaultsReducer,
  useConfigurationLocksReducer,
  useConfigurationTouched,
  useExtensions,
  useExtensionStateReducer,
  useSetActiveExtensions,
  useSetConfiguration,
  useSetConfigurationTouched,
  useSetConfigurationWarnings,
} from 'hooks/jotai/globals-wrapper';
import { ExtensionsState } from 'function/global/types';

import './extension-manager.css';
import { info } from 'util/scripts/logging';

import {
  extensionsToOptionEntries,
  getConfigDefaults,
} from 'config/ucp/extension-util';
import ExtensionElement from './extension-element';
import { propagateActiveExtensionsChange } from '../helpers';

export default function ExtensionManager() {
  const extensions = useExtensions();
  const setActiveExtensions = useSetActiveExtensions();
  const [extensionsState, setExtensionsState] = useExtensionStateReducer();

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const [configurationLocks, setConfigurationLocks] =
    useConfigurationLocksReducer();

  const [configurationDefaults, setConfigurationDefaults] =
    useConfigurationDefaultsReducer();

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

  const eds = new ExtensionDependencySolver(extensions);
  const revDeps = Object.fromEntries(
    extensions.map((e: Extension) => [
      e.name,
      eds.reverseDependenciesFor(e.name),
    ])
  );
  const depsFor = Object.fromEntries(
    extensions.map((e: Extension) => [
      e.name,
      eds
        .dependenciesFor(e.name)
        .flat()
        .filter((s) => s !== e.name),
    ])
  );
  const extensionsByName = Object.fromEntries(
    extensions.map((ext: Extension) => [ext.name, ext])
  );
  const extensionsByNameVersionString = Object.fromEntries(
    extensions.map((ext: Extension) => [`${ext.name}-${ext.version}`, ext])
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

        const dependencyExtensionNames = eds.dependenciesFor(ext.name).flat();

        const dependencies: Extension[] = dependencyExtensionNames
          .filter(
            (v: string) =>
              extensionsState.activeExtensions
                .map((e: Extension) => e.name)
                .indexOf(v) === -1
          )
          .map((v: string) => {
            if (extensionsByName[v] !== undefined) {
              return extensionsByName[v];
            }
            throw new Error();
          }) //           .filter((e: Extension) => dependencyExtensionNames.indexOf(e.name) !== -1)
          .reverse();

        const remainder = extensionsState.activeExtensions
          .flat()
          .map((e: Extension) => `${e.name}-${e.version}`)
          .filter(
            (es) =>
              dependencies
                .map((e: Extension) => `${e.name}-${e.version}`)
                .indexOf(es) === -1
          )
          .map((es: string) => extensionsByNameVersionString[es]);

        const final = [...dependencies, ...remainder];

        const localEDS = new ExtensionDependencySolver(final);
        info(localEDS.solve());
        const order = localEDS
          .solve()
          .reverse()
          .map((a: string[]) => a.map((v: string) => extensionsByName[v]));

        onActiveExtensionsUpdate(final);
        propagateActiveExtensionsChange(final, {
          setActiveExtensions,
          extensionsState,
          setExtensionsState,
          setConfiguration,
          setConfigurationDefaults,
          setConfigurationTouched,
          setConfigurationWarnings,
          setConfigurationLocks,
        });
        setExtensionsState({
          // allExtensions: extensionsState.allExtensions,
          activatedExtensions: [...extensionsState.activatedExtensions, ext],
          //  activeExtensions: final,
          installedExtensions: extensionsState.installedExtensions.filter(
            (e: Extension) =>
              final
                .map((ex: Extension) => `${ex.name}-${ex.version}`)
                .indexOf(`${e.name}-${e.version}`) === -1
          ),
        });
        setActiveExtensions(final);
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
          const relevantExtensions = new Set(
            extensionsState.activatedExtensions
              .filter(
                (e) => `${e.name}-${e.version}` !== `${ext.name}-${ext.version}`
              )
              .map((e: Extension) => eds.dependenciesFor(e.name).flat())
              .flat()
          );

          // extensionsState.activeExtensions.filter((e: Extension) => relevantExtensions.has(e));
          const ae = extensionsState.activeExtensions.filter((e) =>
            relevantExtensions.has(e.name)
          );
          onActiveExtensionsUpdate(ae);
          setExtensionsState({
            allExtensions: extensionsState.allExtensions,
            activatedExtensions: extensionsState.activatedExtensions.filter(
              (e) => `${e.name}-${e.version}` !== `${ext.name}-${ext.version}`
            ),
            activeExtensions: ae,
            installedExtensions: extensions
              .filter((e: Extension) => !relevantExtensions.has(e.name))
              .sort((a: Extension, b: Extension) =>
                a.name.localeCompare(b.name)
              ),
          } as unknown as ExtensionsState);
          setActiveExtensions(ae);
        }}
        moveCallback={(event: { name: string; type: 'up' | 'down' }) => {
          const { name, type } = event;
          const aei = extensionsState.activeExtensions
            .map((e) => e.name)
            .indexOf(name);
          const element = extensionsState.activeExtensions[aei];
          let newIndex = type === 'up' ? aei - 1 : aei + 1;
          newIndex = newIndex < 0 ? 0 : newIndex;
          newIndex =
            newIndex > extensionsState.activeExtensions.length - 1
              ? extensionsState.activeExtensions.length - 1
              : newIndex;
          extensionsState.activeExtensions.splice(aei, 1);
          extensionsState.activeExtensions.splice(newIndex, 0, element);
          onActiveExtensionsUpdate(extensionsState.activeExtensions);
          setExtensionsState({
            activeExtensions: extensionsState.activeExtensions,
          } as unknown as ExtensionsState);
          setActiveExtensions(extensionsState.activeExtensions);
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
    <Container className="fs-6 h-100">
      <div className="pb-2 h-50 d-flex flex-column overflow-hidden">
        <h4>{t('gui-editor:extensions.activated')}</h4>
        <div
          style={{
            overflowY: 'scroll',
            overflowX: 'clip',
            backgroundColor: 'var(--bs-gray-800)',
          }}
          className="border-secondary border flex-grow-1"
        >
          {activated}
        </div>
      </div>
      <div className="pt-2 h-50 d-flex flex-column overflow-hidden">
        <h4>{t('gui-editor:extensions.available')}</h4>
        <div
          style={{
            overflowY: 'scroll',
            overflowX: 'clip',
            backgroundColor: 'var(--bs-gray-800)',
          }}
          className="border-secondary border flex-grow-1"
        >
          {eUI}
        </div>
      </div>
    </Container>
  );
}
