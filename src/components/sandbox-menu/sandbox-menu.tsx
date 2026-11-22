import './sandbox-menu.css';

import { Suspense, useEffect, useRef, useState } from 'react';
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
  createGetBinaryFileFunction,
} from './sandbox-menu-functions';

// eslint-disable-next-line import/no-unresolved
import frameBaseStyle from './sandbox-frame-base.css?inline';
// eslint-disable-next-line import/no-unresolved, import/extensions
import frameBaseScript from './sandbox-frame-base.js?raw';
import Message from '../general/message';
import saveConfig from './save-custom-menu-config';
import { createGetTextureCatalogInputsFunction } from './texture-catalog-service';
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
  reportInitError: (message: string) => void,
  currentFolder: string,
  baseUrl: string,
  localization: Record<string, string>,
  fallbackLocalization: Record<string, string>,
) {
  return {
    confirmInit: async () => setInitDone(true), // could be done to do stuff after init,
    reportInitError: async (message: string) => reportInitError(message),
    adjustGuiScale,
    getLanguage,
    getLocalizedString: createGetLocalizedStringFunction(
      localization,
      fallbackLocalization,
    ),
    getTextFile: createGetTextFileFunction(currentFolder),
    getAssetUrl: createGetAssetUrlFunction(currentFolder),
    getBinaryFileBase64: createGetBinaryFileFunction(currentFolder),
    getTextureCatalogInputs:
      createGetTextureCatalogInputsFunction(currentFolder),
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const session = useRef(0);

  const save = async (closeAfterSave: boolean) => {
    const currentSession = session.current;
    setSaving(true);
    try {
      const config = await sandbox?.connection?.remote.getConfig();
      if (!config || typeof config !== 'object') {
        throw new Error('The menu did not return a configuration.');
      }
      const qualifiers =
        typeof sandbox?.connection?.remote.getConfigQualifiers === 'function'
          ? await sandbox.connection.remote.getConfigQualifiers()
          : {};
      // Closing/retrying the menu invalidates outstanding RPC responses.
      if (session.current !== currentSession) return;
      saveConfig(baseUrl, config, qualifiers);
      setSaveError(null);
      if (closeAfterSave) closeFunc();
    } catch (error) {
      if (session.current !== currentSession) return;
      setSaveError(
        typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : String(error),
      );
    } finally {
      if (session.current === currentSession) setSaving(false);
    }
  };

  useEffect(() => {
    setInitDone(false);
    setSaveError(null);
    setInitError(null);
    setSaving(false);
    session.current += 1;
    const currentSession = session.current;
    // TODO?: Sandbox currently executes css and js using inline script and style tags
    // the CSP currently allows this only for the sandbox
    // However, it seems to currently simply be needed due to the used lib.
    // Postponed until idea or bigger rework
    let sand: Sandbox | null = null;
    try {
      sand = Sandbox.create(
        createSandboxHostApi(
          (value) => {
            if (session.current === currentSession) setInitDone(value);
          },
          (message) => {
            if (session.current === currentSession) {
              setInitDone(false);
              setInitError(message);
            }
          },
          currentFolder,
          baseUrl,
          localization,
          fallbackLocalization,
        ),
        createSandboxOptions(sandboxDiv, source),
      );
    } catch (error) {
      setInitError(String(error));
    }

    setSandbox(sand);
    return () => {
      session.current += 1;
      sand?.destroy();
    };
  }, [
    baseUrl,
    currentFolder,
    sandboxDiv,
    source,
    localization,
    fallbackLocalization,
    attempt,
  ]);

  return (
    <div className="sandbox-control-menu">
      {initError && (
        <div className="sandbox-error" role="alert">
          <Message message="sandbox.init.error" /> {initError}
          <button
            type="button"
            className="ucp-button sandbox-control-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            <Message message="sandbox.retry" />
          </button>
        </div>
      )}
      {saveError && <span role="alert">{saveError}</span>}
      <button
        type="button"
        className="ucp-button sandbox-control-button"
        disabled={!initDone || saving}
        onClick={() => save(false)}
      >
        <Message message="sandbox.save" />
      </button>
      <button
        type="button"
        className="ucp-button sandbox-control-button"
        disabled={!initDone || saving}
        onClick={() => save(true)}
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
