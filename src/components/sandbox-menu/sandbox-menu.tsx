import './sandbox-menu.css';

import { OverlayContentProps } from 'components/overlay/overlay';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Sandbox, { PluginInstance } from 'websandbox';
import { readTextFile } from 'tauri/tauri-files';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import { getStore } from 'hooks/jotai/base';
import {
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
} from 'function/global/global-atoms';
import { atom, useAtomValue } from 'jotai';
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

interface SandboxSource {
  html: string;
  css: string;
  js: string;
}

// same attributes, but holds paths inside menu folder
type SandboxSourcePaths = SandboxSource;

export interface SandboxArgs {
  baseUrl: string;
  source: SandboxSourcePaths;
}

async function receiveSources(
  currentFolder: string,
  sourcePaths: SandboxSourcePaths,
): Promise<SandboxSource> {
  // TODO: needs changing to be handled by extension io
  return Promise.all([
    readTextFile(sourcePaths.html),
    readTextFile(sourcePaths.css),
    readTextFile(sourcePaths.js),
  ]).then((sourceStrings) =>
    // should these be sanitized?
    // css and js could also be made accessible through assets
    // also, they may/should be restricted to their home folder -> needs test
    ({
      html: sourceStrings[0].ok().getOrElse(''),
      css: sourceStrings[1].ok().getOrElse(''),
      js: sourceStrings[2].ok().getOrElse(''),
    }),
  );
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
  const { baseUrl, source, sandboxDiv } = args;

  const currentFolder = useCurrentGameFolder();
  const sourceData = useAtomValue(
    useMemo(
      () =>
        atom(() =>
          receiveSources(currentFolder, {
            html: source.html,
            css: source.css,
            js: source.js,
          }),
        ),
      [currentFolder, source.html, source.css, source.js],
    ),
  );

  const [sandbox, setSandbox] = useState<null | PluginInstance>(null);

  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    const sand: PluginInstance = Sandbox.create(
      createSandboxHostApi(setInitDone, currentFolder, baseUrl, {}),
      createSandboxOptions(sandboxDiv, sourceData),
    );

    setSandbox(sand);
    return () => sand.destroy();
  }, [baseUrl, currentFolder, sandboxDiv, sourceData]);

  return !sandbox ? null : (
    <div className="sandbox-control-menu">
      <button
        type="button"
        className="sandbox-control-button"
        disabled={!initDone}
        onClick={async () =>
          // we will see, if this works, or just closes the sandbox
          saveConfig(baseUrl, await sandbox.connection.remote.getConfig())
        }
      >
        SAVE
      </button>
      <button
        type="button"
        className="sandbox-control-button"
        disabled={!initDone}
        onClick={async () => {
          saveConfig(baseUrl, await sandbox.connection.remote.getConfig());
          closeFunc();
        }}
      >
        SAVE_AND_CLOSE
      </button>
      <button
        type="button"
        className="sandbox-control-button"
        onClick={closeFunc}
      >
        CLOSE
      </button>
    </div>
  );
}

export function SandboxMenu(props: OverlayContentProps<SandboxArgs>) {
  const { closeFunc, args } = props;

  const sandboxDiv = useRef<null | HTMLDivElement>(null);
  return (
    <div className="sandbox-menu-container">
      <h1 className="sandbox-menu-title">TITLE_TEST</h1>
      <div ref={sandboxDiv} className="sandbox-container" />
      {!sandboxDiv.current ? null : (
        <Suspense>
          <SandboxInternal
            closeFunc={closeFunc}
            args={{ ...args, sandboxDiv: sandboxDiv.current }}
          />
        </Suspense>
      )}
    </div>
  );
}
