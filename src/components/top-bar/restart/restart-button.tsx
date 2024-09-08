import { relaunch } from '@tauri-apps/api/process';

import './restart-button.css';
import Text from '../../general/text';

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
      <Text message="restart" />
    </button>
  );
}
