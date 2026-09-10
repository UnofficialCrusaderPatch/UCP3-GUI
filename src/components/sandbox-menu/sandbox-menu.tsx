import './sandbox-menu.css';

import { Suspense, useEffect, useState } from 'react';
import Sandbox from '@jetbrains/websandbox';

import { OverlayContentProps } from '../overlay/overlay';
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
import Message from '../general/message';
import saveConfig from './save-custom-menu-config';
import { adjustGuiScale } from '../../util/scripts/gui-scaling';

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

function createSandboxHostApi(
  setInitDone: (value: boolean) => void,
  currentFolder: string,
  baseUrl: string,
  localization: Record<string, string>,
  fallbackLocalization: Record<string, string>,
) {
  return {
    confirmInit: async () => setInitDone(true), // could be done to do stuff after init,
    adjustGuiScale,
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
          saveConfig(
            baseUrl,
            await sandbox.connection?.remote.getConfig(),
            typeof sandbox.connection?.remote.getConfigQualifiers === 'function'
              ? await sandbox.connection.remote.getConfigQualifiers()
              : {},
          )
        }
      >
        <Message message="sandbox.save" />
      </button>
      <button
        type="button"
        className="ucp-button sandbox-control-button"
        disabled={!initDone}
        onClick={async () => {
          saveConfig(
            baseUrl,
            await sandbox.connection?.remote.getConfig(),
            typeof sandbox.connection?.remote.getConfigQualifiers === 'function'
              ? await sandbox.connection.remote.getConfigQualifiers()
              : {},
          );
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
