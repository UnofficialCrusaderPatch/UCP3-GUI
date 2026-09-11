/* eslint-disable react/require-default-props */
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { type } from '@tauri-apps/api/os';
import { FolderFill } from 'react-bootstrap-icons';
import { useState } from 'react';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import { useMessage } from '../../../../general/message';
import { showModalOk } from '../../../../modals/modal-ok';
import { ConsoleLogger } from '../../../../../util/scripts/logging';
import { Extension } from '../../../../../config/ucp/common';
import {
  useCurrentGameFolder,
  DOES_UCP_FOLDER_EXIST_ATOM,
} from '../../../../../function/game-folder/utils';
import { CREATOR_MODE_ATOM } from '../../../../../function/gui-settings/settings';
import {
  openExtensionsFolder,
  openInstalledExtension,
} from '../../../../../tauri/tauri-shell';

export function ShellOpenButton(props: {
  clickCallback: () => void | Promise<void>;
  message?: string;
  disabled?: boolean;
  className?: string;
}) {
  const {
    clickCallback,
    message = 'extensions.extension.shell.open',
    disabled = false,
    className = 'fs-8 customize-extension-button',
  } = props;
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  const localize = useMessage();
  const [pending, setPending] = useState(false);
  const showPurpose = () => setStatusBarMessage(message);
  const clearPurpose = () => setStatusBarMessage(undefined);
  return (
    <button
      type="button"
      className={className}
      aria-label={localize(message)}
      title={localize(message)}
      disabled={disabled || pending}
      onClick={async () => {
        setPending(true);
        try {
          await clickCallback();
        } catch (error) {
          ConsoleLogger.error(error);
          await showModalOk({
            title: 'extensions.folder.error.title',
            message: 'extensions.folder.error.message',
          });
        } finally {
          setPending(false);
        }
      }}
      onPointerEnter={showPurpose}
      onPointerLeave={clearPurpose}
      onFocus={showPurpose}
      onBlur={clearPurpose}
    >
      <span>
        <FolderFill aria-hidden="true" />
      </span>
    </button>
  );
}

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

const FILE_MANAGER_OS_ATOM = atom(() => type());

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
