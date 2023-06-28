import {
  OverlayContentProps,
  useOverlayContent,
} from 'components/overlay/overlay';
import { useEffect, useRef, useState } from 'react';
import Sandbox, { PluginInstance } from 'websandbox';

import { readTextFile } from 'tauri/tauri-files';
import { useCurrentGameFolder } from 'hooks/jotai/helper';

// eslint-disable-next-line import/no-unresolved
import frameBaseStyle from './sandbox-frame-base.css?inline';
// eslint-disable-next-line import/no-unresolved, import/extensions
import frameBaseScript from './sandbox-frame-base.js?raw';

import './sandbox-menu.css';

interface SandboxSource {
  html: string;
  css: string;
  js: string;
}

async function receiveLocalizedString(id: string): Promise<string> {
  // TODO -> use module localization
  const test: Record<string, string> = {
    header: 'I am a header.',
    text: 'I am text.',
  };

  return test[id];
}

function SandboxMenu(props: OverlayContentProps) {
  const { closeFunc } = props;

  const currentFolder = useCurrentGameFolder();

  const [sources, setSources] = useState<null | SandboxSource>(null);

  const sandboxDiv = useRef(null);
  const [sandbox, setSandbox] = useState<null | PluginInstance>(null);

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
      { receiveLocalizedString },
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
        <button type="button" className="sandbox-control-button">
          SAVE
        </button>
        <button type="button" className="sandbox-control-button">
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
  const { setOverlayContent } = useOverlayContent();

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
