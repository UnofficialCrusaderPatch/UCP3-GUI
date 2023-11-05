import { OverlayContentProps } from 'components/overlay/overlay';
import { useEffect, useRef, useState } from 'react';
import Sandbox, { PluginInstance } from 'websandbox';
import { readTextFile } from 'tauri/tauri-files';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import Logger, { ConsoleLogger } from 'util/scripts/logging';
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

import './sandbox-menu.css';

const LOGGER = new Logger('sandbox-menu.tsx');

interface SandboxSource {
  html: string;
  css: string;
  js: string;
}

export interface SandboxSourcePaths {
  htmlPath: string;
  cssPath: string;
  jsPath: string;
}

export interface SandboxArgs {
  sourcePaths: SandboxSourcePaths;
  receiveConfig: (config: Record<string, unknown>) => void;
}

async function receiveSources(
  sourcePaths: SandboxSourcePaths,
): Promise<SandboxSource> {
  return Promise.all([
    readTextFile(sourcePaths.htmlPath),
    readTextFile(sourcePaths.cssPath),
    readTextFile(sourcePaths.jsPath),
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

function createSandboxHostApi(
  setInitDone: (value: boolean) => void,
  currentFolder: string,
  localization: Record<string, string>,
  currentConfig: Record<string, unknown>,
  overallConfig: unknown,
) {
  return {
    confirmInit: async () => setInitDone(true), // could be done to do stuff after init,
    getLanguage,
    getLocalizedString: createGetLocalizedStringFunction(localization),
    getTextFile: createGetTextFileFunction(currentFolder),
    getAssetUrl: createGetAssetUrlFunction(currentFolder),
    receivePluginPaths: createReceivePluginPathsFunction(currentFolder),
    getCurrentConfig: createGetCurrentConfigFunction(currentConfig),
    getConfigState: createGetConfigStateFunction(overallConfig),
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

export function SandboxMenu(props: OverlayContentProps<SandboxArgs>) {
  const { closeFunc, args } = props;
  const { sourcePaths, receiveConfig } = args;

  const currentFolder = useCurrentGameFolder();

  const [sources, setSources] = useState<null | SandboxSource>(null);

  const sandboxDiv = useRef<null | HTMLDivElement>(null);
  const [sandbox, setSandbox] = useState<null | PluginInstance>(null);

  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    if (!sources) {
      // eslint-disable-next-line promise/catch-or-return
      receiveSources(sourcePaths).then(setSources);
      return () => {};
    }

    if (!sandboxDiv.current) {
      LOGGER.msg(
        'Unable to create sandbox, since sandbox div is not present.',
      ).error();
      return () => {};
    }

    const sand: PluginInstance = Sandbox.create(
      createSandboxHostApi(setInitDone, currentFolder, {}, {}, {}),
      createSandboxOptions(sandboxDiv.current, sources),
    );
    // this could be used to one time run code or inject css
    // sand.promise
    //   .then(() => sand.injectStyle(sources.css))
    //   .then(() => sand.run(sources.js));

    setSandbox(sand);
    return () => sand.destroy();
  }, [currentFolder, sourcePaths, sources]);

  return (
    <div className="sandbox-menu-container">
      <h1 className="sandbox-menu-title">TITLE_TEST</h1>
      <div ref={sandboxDiv} className="sandbox-container" />

      {/* 
      TODO: both in sandbox, as in the iframe, external links to pictures and websites work.
      We should stop this.
      
      <a href="https://www.w3schools.com/tags/img_girl.jpg">TEst</a> */}
      {!sandbox ? null : (
        <div className="sandbox-control-menu">
          <button
            type="button"
            className="sandbox-control-button"
            disabled={!initDone}
            onClick={async () =>
              // we will see, if this works, or just closes the sandbox
              receiveConfig(await sandbox.connection.remote.getConfig())
            }
          >
            SAVE
          </button>
          <button
            type="button"
            className="sandbox-control-button"
            disabled={!initDone}
            onClick={async () => {
              receiveConfig(await sandbox.connection.remote.getConfig());
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
      )}
    </div>
  );
}
