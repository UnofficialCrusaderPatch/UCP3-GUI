import {
  OverlayContentProps,
  useSetOverlayContent,
} from 'components/overlay/overlay';
import { useEffect, useRef, useState } from 'react';
import Sandbox, { PluginInstance } from 'websandbox';

import { readTextFile, resolvePath } from 'tauri/tauri-files';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import i18next from 'i18next';

// eslint-disable-next-line import/no-unresolved
import { n } from '@tauri-apps/api/event-41a9edf5';
import Option from 'util/structs/option';
import Result from 'util/structs/result';
import frameBaseStyle from './sandbox-frame-base.css?inline';
// eslint-disable-next-line import/no-unresolved, import/extensions
import frameBaseScript from './sandbox-frame-base.js?raw';

import './sandbox-menu.css';

interface SandboxSource {
  html: string;
  css: string;
  js: string;
}

async function getLanguage(): Promise<string> {
  return i18next.language; // is kinda enough, using the hook might be overkill
}

// dummy
async function getLocalizedString(id: string): Promise<string> {
  // TODO -> use module localization
  const test: Record<string, string> = {
    header: 'I am a header.',
    text: 'I am text.',
  };

  return test[id];
}

async function getConfigState(id: string): Promise<unknown> {
  // TODO: should be able to get a config value of other modules to perform logic
  // (it should copy on transmit anyway, so it should not be needed to copy it here)
  return null;
}

function SandboxMenu(props: OverlayContentProps) {
  const { closeFunc } = props;

  const currentFolder = useCurrentGameFolder();

  const [sources, setSources] = useState<null | SandboxSource>(null);

  const sandboxDiv = useRef(null);
  const [sandbox, setSandbox] = useState<null | PluginInstance>(null);

  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    if (!sources) {
      // TODO: needs better handling

      // eslint-disable-next-line promise/catch-or-return
      Promise.all([
        readTextFile(
          `${currentFolder}/ucp/modules/inputHandler-0.1.0/menu/test.html`
        ),
        readTextFile(
          `${currentFolder}/ucp/modules/inputHandler-0.1.0/menu/test.css`
        ),
        readTextFile(
          `${currentFolder}/ucp/modules/inputHandler-0.1.0/menu/test.js`
        ),
      ]).then((sourceStrings) =>
        // should these be sanitized?
        // css and js could also be made accessible through assets
        // also, they may/should be restricted to their home folder -> needs test
        setSources({
          html: sourceStrings[0].ok().getOrElse(''),
          css: sourceStrings[1].ok().getOrElse(''),
          js: sourceStrings[2].ok().getOrElse(''),
        })
      );
      return () => {};
    }

    const sand: PluginInstance = Sandbox.create(
      {
        confirmInit: async () => {
          // could be done to do stuff after init
          setInitDone(true);
        },
        getLanguage,
        getLocalizedString,
        getConfigState,
        getTextFile: async (path): Promise<null | string> =>
          (
            (await readTextFile(
              await resolvePath(currentFolder, path)
            )) as Result<string | null, unknown>
          )
            .ok()
            .getOrElse(null),
        // TODO: resources, like pictures?
      },
      {
        frameContainer: sandboxDiv.current as unknown as Element,
        frameClassName: 'sandbox-frame',
        frameContent: sources.html,

        // combining the sources seems to guarantee that the side can be recovered on reload
        // if this is not wanted or desired, inject or run can be used
        initialStyles: `${frameBaseStyle}\n${sources.css}`,
        codeToRunBeforeInit: `${frameBaseScript}\n${sources.js}`,
      }
    );
    // eslint-disable-next-line promise/catch-or-return

    // this could be used to one time run code or inject css
    // sand.promise
    //   .then(() => sand.injectStyle(sources.css))
    //   .then(() => sand.run(sources.js));

    setSandbox(sand);
    return () => sand.destroy();
  }, [currentFolder, sources]);

  return (
    <div className="sandbox-menu-container">
      <h1 className="sandbox-menu-title">TITLE_TEST</h1>
      <div ref={sandboxDiv} className="sandbox-container" />

      {/* 
      TODO: both in sandbox, as in the iframe, external links to pictures and websites work.
      We should stop this.
      
      <a href="https://www.w3schools.com/tags/img_girl.jpg">TEst</a> */}
      <div className="sandbox-control-menu">
        <button
          type="button"
          className="sandbox-control-button"
          disabled={!initDone}
          onClick={async () =>
            console.log(await sandbox?.connection.remote.getConfig())
          }
        >
          SAVE
        </button>
        <button
          type="button"
          className="sandbox-control-button"
          disabled={!initDone}
          onClick={async () => {
            console.log(await sandbox?.connection.remote.getConfig());
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
    </div>
  );
}

export default function SandboxMenuButton() {
  const setOverlayContent = useSetOverlayContent();

  return (
    <button
      type="button"
      className="sandbox-menu-button"
      onClick={() => setOverlayContent(SandboxMenu)}
    >
      SANDBOX_TEST
    </button>
  );
}
