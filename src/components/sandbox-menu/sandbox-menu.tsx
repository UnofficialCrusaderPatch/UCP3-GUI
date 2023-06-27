import {
  OverlayContentProps,
  useOverlayContent,
} from 'components/overlay/overlay';
import { useEffect, useRef, useState } from 'react';
import Sandbox, { PluginInstance } from 'websandbox';

import './sandbox-menu.css';

function SandboxMenu(props: OverlayContentProps) {
  const { closeFunc } = props;

  const sandboxDiv = useRef(null);
  const [sandbox, setSandbox] = useState<null | PluginInstance>(null);

  useEffect(() => {
    const sand: PluginInstance = Sandbox.create(
      {},
      { frameContainer: sandboxDiv.current as unknown as Element }
    );
    setSandbox(sand);
    return () => sand.destroy();
  }, []);

  return (
    <div className="sandbox-menu-container">
      <h1 className="sandbox-menu-title">TITLE_TEST</h1>
      <div ref={sandboxDiv} className="sandbox-container" />
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
