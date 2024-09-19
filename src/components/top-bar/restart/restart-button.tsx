import { relaunch } from '@tauri-apps/api/process';

import './restart-button.css';
import Message from '../../general/message';

// eslint-disable-next-line import/prefer-default-export
export function RestartButton() {
  return (
    <button
      type="button"
      className="restart-button"
      onClick={async () => {
        await relaunch();
      }}
    >
      <Message message="restart" />
    </button>
  );
}
