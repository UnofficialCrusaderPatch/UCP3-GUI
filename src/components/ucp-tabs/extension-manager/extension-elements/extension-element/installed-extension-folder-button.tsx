import { atom, useAtomValue } from 'jotai';
import { type } from '@tauri-apps/api/os';
import { Extension } from '../../../../../config/ucp/common';
import { useCurrentGameFolder } from '../../../../../function/game-folder/utils';
import { CREATOR_MODE_ATOM } from '../../../../../function/gui-settings/settings';
import { openInstalledExtension } from '../../../../../tauri/tauri-shell';
import { ShellOpenButton } from './shell-open-button';

const FILE_MANAGER_OS_ATOM = atom(() => type());

// eslint-disable-next-line import/prefer-default-export
export function InstalledExtensionFolderButton(props: {
  extension: Extension;
  active: boolean;
}) {
  const { extension, active } = props;
  const gameFolder = useCurrentGameFolder();
  const creatorMode = useAtomValue(CREATOR_MODE_ATOM);
  const os = useAtomValue(FILE_MANAGER_OS_ATOM);
  const openDirectory =
    active &&
    creatorMode &&
    extension.type === 'plugin' &&
    extension.io.isDirectory;
  const revealMessage =
    os === 'Windows_NT'
      ? 'extensions.extension.shell.reveal'
      : 'extensions.extension.shell.parent';
  const message = openDirectory
    ? 'extensions.extension.shell.open'
    : revealMessage;

  if (
    !extension.io.path ||
    (!extension.io.isDirectory && !extension.io.isZip)
  ) {
    return null;
  }

  return (
    <ShellOpenButton
      message={message}
      disabled={!gameFolder}
      clickCallback={() =>
        openInstalledExtension(gameFolder, extension.io.path, openDirectory)
      }
    />
  );
}
