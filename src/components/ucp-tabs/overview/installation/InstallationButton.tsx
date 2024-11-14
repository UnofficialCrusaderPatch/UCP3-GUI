import { useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { GAME_FOLDER_ATOM } from '../../../../function/game-folder/interface';
import { hintThatGameMayBeRunning } from '../../../../function/game-folder/locks/file-locks';
import { reloadCurrentGameFolder } from '../../../../function/game-folder/modifications/reload-current-game-folder';
import { installUCPFromZip } from '../../../../function/installation/install-ucp-from-zip';
import { UCP_SIMPLIFIED_VERSION_ATOM } from '../../../../function/ucp-files/ucp-version';
import { getStore } from '../../../../hooks/jotai/base';
import { asPercentage } from '../../../../tauri/tauri-http';
import { showModalOk } from '../../../modals/modal-ok';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { ToastType } from '../../../toasts/toasts-display';
import OverviewButton from '../overview-button';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { removeFile } from '../../../../tauri/tauri-files';
import Logger from '../../../../util/scripts/logging';
import {
  FRAMEWORK_UPDATER_ATOM,
  FrameworkUpdateStatus,
  HAS_UPDATE_ATOM,
  HAS_UPDATE_QUERY_ATOM,
} from './atoms';

const LOGGER = new Logger('InstallationButton.tsx');

function labelForUpdateStatus(updateStatus: FrameworkUpdateStatus | undefined) {
  if (updateStatus === undefined || updateStatus.status === 'installed') {
    return 'overview.framework.update.idle';
  }
  if (updateStatus.status === 'update') {
    return 'overview.framework.update.available';
  }
  if (updateStatus.status === 'no_update') {
    return 'overview.framework.update.uptodate';
  }

  return 'overview.framework.install';
}

// eslint-disable-next-line import/prefer-default-export
export function InstallationButton() {
  const currentFolder = useCurrentGameFolder();
  const [overviewButtonActive, setOverviewButtonActive] = useState(true);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const updateStatus = useAtomValue(HAS_UPDATE_ATOM);

  const buttonLabel = labelForUpdateStatus(updateStatus);

  useAtomValue(HAS_UPDATE_QUERY_ATOM);

  return (
    <OverviewButton
      buttonActive={
        overviewButtonActive &&
        currentFolder !== '' &&
        updateStatus.status !== 'no_update'
      }
      buttonText={buttonLabel}
      buttonVariant="ucp-button overview__text-button"
      funcBefore={() => setOverviewButtonActive(false)}
      funcAfter={() => setOverviewButtonActive(true)}
      func={async (createStatusToast) => {
        if (updateStatus.status === 'no_update') {
          return;
        }

        if (await hintThatGameMayBeRunning()) {
          createStatusToast(ToastType.ERROR, 'locked.files');
          return;
        }

        try {
          LOGGER.msg('check for updates and install').info();

          const gameFolder = getStore().get(GAME_FOLDER_ATOM);
          if (gameFolder === '') {
            createStatusToast(
              ToastType.ERROR,
              'Game folder in bad state. Cannot save framework to disk.', // TODO: needs localization
            );
            return;
          }

          const { type } = getStore().get(UCP_SIMPLIFIED_VERSION_ATOM);

          const updater = getStore().get(FRAMEWORK_UPDATER_ATOM);

          if (await updater.doesUpdateExist()) {
            // createStatusToast(ToastType.INFO, 'ucp.version.available');
          } else {
            createStatusToast(ToastType.WARN, 'ucp.version.not.available');
            return;
          }

          const dialogResult = await showModalOkCancel({
            title: 'confirm',
            message: {
              key: 'ucp.download.request',
              args: {
                version: updater.meta!.version,
              },
            },
          });

          if (dialogResult !== true) {
            createStatusToast(ToastType.WARN, 'ucp.download.cancelled');
            return;
          }

          createStatusToast(ToastType.INFO, 'ucp.download.download');

          const downloadStart = new Date();
          let previousFire = downloadStart;
          const updateInterval = 500; // milliseconds

          const update = await updater.fetchUpdateToGamefolder(
            type,
            (
              chunkSize: number,
              currentSize: number,
              totalSize: number,
              currentPercent: number,
            ) => {
              const tt = new Date();
              if (tt.getTime() - previousFire.getTime() > updateInterval) {
                previousFire = tt;
                setStatusBarMessage(
                  `Downloading... ${asPercentage(currentPercent)} (${Math.ceil(currentSize / 1000 / 1000)} MB/${Math.ceil(totalSize / 1000 / 1000)} MB)`,
                );
              }
            },
          );

          setStatusBarMessage(undefined);

          createStatusToast(ToastType.INFO, {
            key: `ucp.download.downloaded`,
            args: { version: `${update.name}` },
          });

          createStatusToast(ToastType.INFO, 'ucp.installing');
          const installResult = await installUCPFromZip(
            update.path,
            gameFolder,
            createStatusToast,
          );

          if (installResult.isErr()) {
            installResult.err().ifPresent((error) => {
              createStatusToast(ToastType.ERROR, {
                key: 'ucp.install.failed',
                args: { error },
              });
            });
            return;
          }

          // TODO: in the future, use a cache?
          const removeResult = await removeFile(update.path);
          if (removeResult.isErr()) {
            await showModalOk({
              message: {
                key: 'ucp.install.zip.remove.failed',
                args: {
                  error: removeResult.err().get(),
                },
              },
              title: 'Could not remove file',
            });
          }

          createStatusToast(ToastType.SUCCESS, 'overview.update.success');

          getStore().set(HAS_UPDATE_ATOM, { status: 'no_update' });

          await showModalOk({
            title: 'Reload required',
            message: 'The GUI will now reload.',
          });

          reloadCurrentGameFolder();
        } catch (e: unknown) {
          createStatusToast(ToastType.ERROR, {
            key: 'overview.install.failed.unknown.reason',
            args: {
              error: String(e),
              url: 'https://github.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch3/releases',
            },
          });
        }
      }}
      toastTitle="overview.update.toast.title"
    />
  );
}
