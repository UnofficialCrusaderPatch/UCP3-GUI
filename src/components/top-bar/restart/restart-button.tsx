import { relaunch } from '@tauri-apps/api/process';

import './restart-button.css';
import Message from '../../general/message';
import { saveGuiFileConfig } from '../../../function/gui-settings/gui-file-config';

// TODO: check if this could be removed

// eslint-disable-next-line import/prefer-default-export
export function RestartButton() {
  return (
    <button
      type="button"
      className="restart-button"
      onClick={async () => {
        await saveGuiFileConfig();
        await relaunch();
      }}
    >
      <Message message="restart" />
    </button>
  );
}
