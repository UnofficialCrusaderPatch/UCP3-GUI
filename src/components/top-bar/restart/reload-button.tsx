import './restart-button.css';

import Message from '../../general/message';
import { reloadCurrentGameFolder } from '../../../function/game-folder/game-folder-interface';

// eslint-disable-next-line import/prefer-default-export
export function ReloadButton() {
  return (
    <button
      type="button"
      className="reload-button"
      onClick={() => reloadCurrentGameFolder()}
    >
      <Message message="reload" />
    </button>
  );
}
