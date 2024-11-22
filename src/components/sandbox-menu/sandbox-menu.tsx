import './sandbox-menu.css';

import { Suspense, useEffect, useState } from 'react';
import Sandbox from '@jetbrains/websandbox';

import { OverlayContentProps } from '../overlay/overlay';
import { getStore } from '../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../function/configuration/state';
import { useCurrentGameFolder } from '../../function/game-folder/utils';

import {
  getLanguage,
  createGetLocalizedStringFunction,
  createGetTextFileFunction,
  createGetAssetUrlFunction,
  createGetConfigStateFunction,
  createGetCurrentConfigFunction,
  createReceivePluginPathsFunction,
} from './sandbox-menu-functions';

// eslint-disable-next-line import/no-unresolved
import frameBaseStyle from './sandbox-frame-base.css?inline';
// eslint-disable-next-line import/no-unresolved, import/extensions
import frameBaseScript from './sandbox-frame-base.js?raw';
import { ConsoleLogger } from '../../util/scripts/logging';
import Message from '../general/message';
import { CONFIGURATION_DEFAULTS_REDUCER_ATOM } from '../../function/configuration/derived-state';

export interface SandboxSource {
  html: string;
  css: string;
  js: string;
}

// same attributes, but holds paths inside menu folder
export type SandboxSourcePaths = SandboxSource;

export interface SandboxArgs {
  baseUrl: string;
  source: SandboxSource;
  localization: Record<string, string>;
  fallbackLocalization: Record<string, string>;
  title?: string;
}

function saveConfig(baseUrl: string, config: Record<string, unknown>) {
  // Log what was returned from the custom menu
  ConsoleLogger.debug(`sandbox-menu: saveConfig: ${baseUrl}`, config);

  // Prepend the baseUrl to the entries returned from the config menu
  const prependedConfig = Object.fromEntries(
    Object.entries(config).map(([subUrl, newConfigValue]) => [
      `${baseUrl}.${subUrl}`,
      newConfigValue,
    ]),
  );

  // Gather the keys that were set to value `undefined`
  // These keys will be cleared from the user config
  // Note they are not cleared from the baseline or defaults config
  // If that is desired, a special "none" value should be defined that the backend understands too
  const toBeCleared = Object.entries(prependedConfig)
    .filter(([, value]) => value === undefined)
    .map(([url]) => url);

  // Clear from the user config
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'clear-keys',
    keys: toBeCleared,
  });

  // Gather the new user config entries that should be overridden
  // in the user config and the full config
  const userConfigEntries = Object.fromEntries(
    Object.entries(prependedConfig).filter(([, value]) => value !== undefined),
  );

  // Overwrite the values in the user config.
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'set-multiple',
    value: userConfigEntries,
  });

  // Update the touched state with which things were touched
  // Note we only include things that are not undefined
  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'set-multiple',
    value: Object.fromEntries(
      Object.keys(userConfigEntries).map((key) => [key, true]),
    ),
  });

  // Compute full config based on defaults and user values
  // TODO: currently no support for setting required/suggested
  const baseline = getStore().get(CONFIGURATION_DEFAULTS_REDUCER_ATOM);
  const baselineEntries: [string, unknown][] = Object.entries(baseline).filter(
    ([url]) => url.startsWith(baseUrl),
  );

  // TODO: not 100% sure if this "recomputation" of the config values is necessary in all cases
  // but since this is a Custom Menu let's do it this way anyway
  const fullConfigEntries: Record<string, unknown> = {
    ...baselineEntries,
    ...userConfigEntries,
  };

  // Update the full config
  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'set-multiple',
    value: fullConfigEntries,
  });
}

function createSandboxHostApi(
  setInitDone: (value: boolean) => void,
  currentFolder: string,
  baseUrl: string,
  localization: Record<string, string>,
  fallbackLocalization: Record<string, string>,
) {
  return {
    confirmInit: async () => setInitDone(true), // could be done to do stuff after init,
    getLanguage,
    getLocalizedString: createGetLocalizedStringFunction(
      localization,
      fallbackLocalization,
    ),
    getTextFile: createGetTextFileFunction(currentFolder),
    getAssetUrl: createGetAssetUrlFunction(currentFolder),
    receivePluginPaths: createReceivePluginPathsFunction(currentFolder),
    getCurrentConfig: createGetCurrentConfigFunction(baseUrl),
    getConfigState: createGetConfigStateFunction(),
  };
}

function createSandboxOptions(
  sandboxContainer: Element,
  sources: SandboxSource,
) {
  return {
    frameContainer: sandboxContainer,
    frameClassName: 'sandbox-frame',
    frameContent: sources.html,

    // combining the sources seems to guarantee that the side can be recovered on reload
    // if this is not wanted or desired, inject or run can be used
    initialStyles: `${frameBaseStyle}\n${sources.css}`,
    codeToRunBeforeInit: `${frameBaseScript}\n${sources.js}`,
  };
}

function SandboxInternal(
  props: OverlayContentProps<SandboxArgs & { sandboxDiv: HTMLDivElement }>,
) {
  const { closeFunc, args } = props;
  const { baseUrl, source, localization, fallbackLocalization, sandboxDiv } =
    args;

  const currentFolder = useCurrentGameFolder();

  const [sandbox, setSandbox] = useState<null | Sandbox>(null);

  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    // TODO?: Sandbox currently executes css and js using inline script and style tags
    // the CSP currently allows this only for the sandbox
    // However, it seems to currently simply be needed due to the used lib.
    // Postponed until idea or bigger rework
    const sand: Sandbox = Sandbox.create(
      createSandboxHostApi(
        setInitDone,
        currentFolder,
        baseUrl,
        localization,
        fallbackLocalization,
      ),
      createSandboxOptions(sandboxDiv, source),
    );

    setSandbox(sand);
    return () => sand.destroy();
  }, [
    baseUrl,
    currentFolder,
    sandboxDiv,
    source,
    localization,
    fallbackLocalization,
  ]);

  return !sandbox ? null : (
    <div className="sandbox-control-menu">
      <button
        type="button"
        className="ucp-button sandbox-control-button"
        disabled={!initDone}
        onClick={async () =>
          // we will see, if this works, or just closes the sandbox
          saveConfig(baseUrl, await sandbox.connection?.remote.getConfig())
        }
      >
        <Message message="sandbox.save" />
      </button>
      <button
        type="button"
        className="ucp-button sandbox-control-button"
        disabled={!initDone}
        onClick={async () => {
          saveConfig(baseUrl, await sandbox.connection?.remote.getConfig());
          closeFunc();
        }}
      >
        <Message message="sandbox.save.close" />
      </button>
      <button
        type="button"
        className="ucp-button sandbox-control-button"
        onClick={closeFunc}
      >
        <Message message="sandbox.close" />
      </button>
    </div>
  );
}

export function SandboxMenu(props: OverlayContentProps<SandboxArgs>) {
  const { closeFunc, args } = props;
  const { title } = args;

  const [sandboxDiv, setSandboxDiv] = useState<null | HTMLDivElement>(null);
  return (
    <div className="sandbox-menu-container">
      {!title ? null : <h1 className="sandbox-menu-title">{title}</h1>}
      <div ref={setSandboxDiv} className="outline-border sandbox-container" />
      {!sandboxDiv ? null : (
        <Suspense>
          <SandboxInternal
            closeFunc={closeFunc}
            args={{ ...args, sandboxDiv }}
          />
        </Suspense>
      )}
    </div>
  );
}
