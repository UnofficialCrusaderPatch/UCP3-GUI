import './restart-button.css';

import Message from '../../general/message';
import { reloadCurrentGameFolder } from '../../../function/game-folder/modifications/reload-current-game-folder';

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
