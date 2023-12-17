import './sandbox-menu.css';

import { OverlayContentProps } from 'components/overlay/overlay';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { getStore } from 'hooks/jotai/base';
import {
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
} from 'function/configuration/state';
import { useCurrentGameFolder } from 'function/game-folder/state';
import Sandbox, { PluginInstance } from 'websandbox';

import { useTranslation } from 'react-i18next';
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
  localizedStrings: Record<string, string>;
  title?: string;
}

function saveConfig(baseUrl: string, config: Record<string, unknown>) {
  const newConfigEntries = Object.fromEntries(
    Object.entries(config).map(([subUrl, newConfigValue]) => [
      `${baseUrl}.${subUrl}`,
      newConfigValue,
    ]),
  );

  getStore().set(CONFIGURATION_REDUCER_ATOM, {
    type: 'set-multiple',
    value: newConfigEntries,
  });

  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'set-multiple',
    value: Object.fromEntries(
      Object.keys(newConfigEntries).map((key) => [key, true]),
    ),
  });
}

function createSandboxHostApi(
  setInitDone: (value: boolean) => void,
  currentFolder: string,
  baseUrl: string,
  localization: Record<string, string>,
) {
  return {
    confirmInit: async () => setInitDone(true), // could be done to do stuff after init,
    getLanguage,
    getLocalizedString: createGetLocalizedStringFunction(localization),
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
  const { baseUrl, source, localizedStrings, sandboxDiv } = args;

  const [t] = useTranslation(['gui-editor']);
  const currentFolder = useCurrentGameFolder();

  const [sandbox, setSandbox] = useState<null | PluginInstance>(null);

  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    const sand: PluginInstance = Sandbox.create(
      createSandboxHostApi(
        setInitDone,
        currentFolder,
        baseUrl,
        localizedStrings,
      ),
      createSandboxOptions(sandboxDiv, source),
    );

    setSandbox(sand);
    return () => sand.destroy();
  }, [baseUrl, currentFolder, sandboxDiv, source, localizedStrings]);

  return !sandbox ? null : (
    <div className="sandbox-control-menu">
      <button
        type="button"
        className="ucp-button sandbox-control-button"
        disabled={!initDone}
        onClick={async () =>
          // we will see, if this works, or just closes the sandbox
          saveConfig(baseUrl, await sandbox.connection.remote.getConfig())
        }
      >
        {t('gui-editor:sandbox.save')}
      </button>
      <button
        type="button"
        className="ucp-button sandbox-control-button"
        disabled={!initDone}
        onClick={async () => {
          saveConfig(baseUrl, await sandbox.connection.remote.getConfig());
          closeFunc();
        }}
      >
        {t('gui-editor:sandbox.save.close')}
      </button>
      <button
        type="button"
        className="ucp-button sandbox-control-button"
        onClick={closeFunc}
      >
        {t('gui-editor:sandbox.close')}
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