import { useAtomValue } from 'jotai';
import {
  useCurrentGameFolder,
  DOES_UCP_FOLDER_EXIST_ATOM,
} from '../../../../function/game-folder/utils';
import { openExtensionsFolder } from '../../../../tauri/tauri-shell';
import { ShellOpenButton } from '../extension-elements/extension-element/shell-open-button';

// eslint-disable-next-line import/prefer-default-export
export function OpenExtensionsFolderButton() {
  const gameFolder = useCurrentGameFolder();
  const exists = useAtomValue(DOES_UCP_FOLDER_EXIST_ATOM);
  return (
    <ShellOpenButton
      className="ucp-button ucp-button--square text-light"
      message="extensions.folder.open"
      disabled={!gameFolder || exists.state !== 'hasData' || !exists.data}
      clickCallback={() => openExtensionsFolder(gameFolder)}
    />
  );
}
