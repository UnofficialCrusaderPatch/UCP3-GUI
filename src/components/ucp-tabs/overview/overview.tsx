import './overview.css';

import { useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';

import { installUCPFromZip } from '../../../function/installation/install-ucp-from-zip';
import { UCP_VERSION_ATOM } from '../../../function/ucp-files/ucp-version';
import { UCP3Updater } from '../../../function/download/github';
import { getStore } from '../../../hooks/jotai/base';
import { removeDir, removeFile, resolvePath } from '../../../tauri/tauri-files';
import {
  LOADABLE_UCP_STATE_ATOM,
  UCPFilesState,
  activateUCP,
  deactivateUCP,
} from '../../../function/ucp-files/ucp-state';

import { openFileDialog } from '../../../tauri/tauri-dialog';
import Result from '../../../util/structs/result';
import { showModalOkCancel } from '../../modals/modal-ok-cancel';
import { showModalOk } from '../../modals/modal-ok';
import { useCurrentGameFolder } from '../../../function/game-folder/utils';
import RecentFolders from './recent-folders';
import OverviewButton from './overview-button';
import { ToastType } from '../../toasts/toasts-display';
import {
  LUA_DLL,
  REAL_BINK_FILENAME,
  RPS_DLL,
  UCP_BINK_FILENAME,
  UCP_CONFIG_YML,
  UCP_DLL,
  UCP_ERROR_LOG,
  UCP_FOLDER,
  UCP_LOG,
} from '../../../function/global/constants/file-constants';
import { STATUS_BAR_MESSAGE_ATOM } from '../../footer/footer';
import Logger from '../../../util/scripts/logging';
import { hintThatGameMayBeRunning } from '../../../function/game-folder/locks/file-locks';
import { asPercentage } from '../../../tauri/tauri-http';
import { useMessage } from '../../general/message';
import { GAME_FOLDER_ATOM } from '../../../function/game-folder/interface';
import { NewsHighlights } from './news-highlights';
import { reloadCurrentGameFolder } from '../../../function/game-folder/modifications/reload-current-game-folder';

const LOGGER = new Logger('overview.tsx');

export default function Overview() {
  const currentFolder = useCurrentGameFolder();
  const loadableUcpState = useAtomValue(LOADABLE_UCP_STATE_ATOM);

  const [overviewButtonActive, setOverviewButtonActive] = useState(true);

  // needed for file interaction at the moment
  const localize = useMessage();

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  const ucpStatePresent = loadableUcpState.state === 'hasData';
  const ucpState = ucpStatePresent
    ? loadableUcpState.data
    : UCPFilesState.UNKNOWN;
  let activateButtonString = null;
  if (!ucpStatePresent) {
    activateButtonString = 'loading';
  } else {
    switch (ucpState) {
      case UCPFilesState.NOT_INSTALLED:
      case UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK:
        activateButtonString = 'overview.activate.not.installed';
        break;
      case UCPFilesState.ACTIVE:
      case UCPFilesState.BINK_UCP_MISSING:
      case UCPFilesState.BINK_VERSION_DIFFERENCE:
        activateButtonString = 'overview.activate.do.deactivate';
        break;
      case UCPFilesState.INACTIVE:
      case UCPFilesState.BINK_REAL_COPY_MISSING:
        activateButtonString = 'overview.activate.do.activate';
        break;
      case UCPFilesState.WRONG_FOLDER:
        activateButtonString = 'overview.wrong.folder';
        break;
      case UCPFilesState.INVALID:
        activateButtonString = 'overview.activate.invalid';
        break;
      default:
        activateButtonString = 'overview.activate.unknown';
        break;
    }
  }

  return (
    <div className="flex-default overview">
      <RecentFolders />

      <OverviewButton
        buttonActive={overviewButtonActive && currentFolder !== ''}
        buttonText="overview.update.idle"
        buttonVariant="ucp-button overview__text-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (createStatusToast) => {
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
                'Game folder in bad state. Cannot save update to disk.', // TODO: needs localization
              );
              return;
            }

            createStatusToast(ToastType.INFO, 'ucp.version.check');

            const vr = getStore().get(UCP_VERSION_ATOM);
            let version = '0.0.0';
            let sha = '';
            let type: 'Release' | 'Developer' = 'Release';
            if (vr.status === 'ok') {
              version = `${vr.version.getMajorAsString()}.${vr.version.getMinorAsString()}.${vr.version.getPatchAsString()}`;
              sha = vr.version!.sha.getOrElse('!');
              type =
                vr.version.getBuildRepresentation() === 'Developer'
                  ? 'Developer'
                  : type;
            }

            const updater = new UCP3Updater(version, sha, new Date(0));

            if (await updater.doesUpdateExist()) {
              createStatusToast(ToastType.INFO, 'ucp.version.available');
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

            await showModalOk({
              title: 'Reload required',
              message: 'The GUI will now reload.',
            });

            reloadCurrentGameFolder();

            createStatusToast(ToastType.SUCCESS, 'overview.update.success');
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
      <OverviewButton
        buttonActive={overviewButtonActive && currentFolder !== ''}
        buttonText="overview.zip.idle"
        buttonVariant="zip-icon icon-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (createStatusToast) => {
          if (await hintThatGameMayBeRunning()) {
            createStatusToast(ToastType.ERROR, 'locked.files');
            return;
          }

          try {
            const zipFilePath = await openFileDialog(currentFolder, [
              { name: localize('file.zip'), extensions: ['zip'] },
              { name: localize('file.all'), extensions: ['*'] },
            ]);

            if (zipFilePath.isEmpty()) {
              createStatusToast(ToastType.INFO, 'overview.zip.failed');
              return;
            }

            // TODO: improve feedback
            const zipInstallResult = await installUCPFromZip(
              zipFilePath.get(),
              currentFolder,
              createStatusToast,
            );

            if (zipInstallResult.ok().isPresent()) {
              const confirmed = await showModalOkCancel({
                title: 'require.reload.title',
                message: 'overview.require.reload.text',
              });
              // const confirmed = await confirm(
              //   'overview.require.reload.text',
              //   { title: 'require.reload.title', type: 'warning' }
              // );

              if (confirmed) {
                reloadCurrentGameFolder();
              }
            }
            zipInstallResult
              .mapErr((err) => String(err))
              .consider(
                () =>
                  createStatusToast(ToastType.SUCCESS, 'overview.zip.success'),
                (err) => createStatusToast(ToastType.ERROR, err),
              );
          } catch (e: unknown) {
            await showModalOk({ message: String(e), title: 'ERROR' });
          }
        }}
        toastTitle="overview.zip.toast.title"
      />
      <OverviewButton
        buttonActive={
          overviewButtonActive &&
          (ucpState === UCPFilesState.ACTIVE ||
            ucpState === UCPFilesState.INACTIVE ||
            ucpState === UCPFilesState.BINK_UCP_MISSING ||
            ucpState === UCPFilesState.BINK_REAL_COPY_MISSING ||
            ucpState === UCPFilesState.BINK_VERSION_DIFFERENCE)
        }
        buttonText={activateButtonString}
        buttonVariant="ucp-button overview__text-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (createStatusToast) => {
          if (await hintThatGameMayBeRunning()) {
            createStatusToast(ToastType.ERROR, 'locked.files');
            return;
          }

          try {
            let result = Result.emptyOk();
            if (
              ucpState === UCPFilesState.ACTIVE ||
              ucpState === UCPFilesState.BINK_UCP_MISSING ||
              ucpState === UCPFilesState.BINK_VERSION_DIFFERENCE
            ) {
              result = await deactivateUCP();
            } else if (
              ucpState === UCPFilesState.INACTIVE ||
              ucpState === UCPFilesState.BINK_REAL_COPY_MISSING
            ) {
              result = await activateUCP();
            }
            result
              .err()
              .map(String)
              .ifPresent((err) => createStatusToast(ToastType.ERROR, err));
          } catch (e: unknown) {
            await showModalOk({ message: String(e), title: 'ERROR' });
          }
        }}
        tooltip="overview.activate.tooltip"
        toastTitle="overview.activate.toast.title"
      />
      <OverviewButton
        buttonActive={
          overviewButtonActive &&
          (ucpState === UCPFilesState.ACTIVE ||
            ucpState === UCPFilesState.INACTIVE ||
            ucpState === UCPFilesState.BINK_UCP_MISSING ||
            ucpState === UCPFilesState.BINK_REAL_COPY_MISSING ||
            ucpState === UCPFilesState.BINK_VERSION_DIFFERENCE)
        }
        buttonText="overview.uninstall.idle"
        buttonVariant="ucp-button overview__text-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (createStatusToast) => {
          if (await hintThatGameMayBeRunning()) {
            createStatusToast(ToastType.ERROR, 'locked.files');
            return;
          }

          if (
            !(await showModalOkCancel({
              message: 'overview.uninstall.question',
              title: 'overview.uninstall.idle',
              ok: 'yes',
              cancel: 'no',
            }))
          ) {
            return;
          }

          if (
            !(await showModalOkCancel({
              message: 'overview.uninstall.question.really',
              title: 'overview.uninstall.idle',
              ok: 'yes',
              cancel: 'no',
            }))
          ) {
            return;
          }

          const deactivateResult = await deactivateUCP();
          if (deactivateResult.isErr()) {
            createStatusToast(
              ToastType.ERROR,
              String(deactivateResult.err().get()),
            );
            return;
          }

          try {
            (
              await removeDir(
                await resolvePath(currentFolder, UCP_FOLDER),
                true,
                true,
              )
            ).throwIfErr();
            (
              await removeFile(await resolvePath(currentFolder, UCP_DLL), true)
            ).throwIfErr();
            (
              await removeFile(await resolvePath(currentFolder, LUA_DLL), true)
            ).throwIfErr();
            (
              await removeFile(await resolvePath(currentFolder, RPS_DLL), true)
            ).throwIfErr();
            (
              await removeFile(
                await resolvePath(currentFolder, UCP_CONFIG_YML),
                true,
              )
            ).throwIfErr();
            (
              await removeFile(await resolvePath(currentFolder, UCP_LOG), true)
            ).throwIfErr();
            (
              await removeFile(
                await resolvePath(currentFolder, UCP_ERROR_LOG),
                true,
              )
            ).throwIfErr();
            (
              await removeFile(
                await resolvePath(currentFolder, REAL_BINK_FILENAME),
                true,
              )
            ).throwIfErr();
            (
              await removeFile(
                await resolvePath(currentFolder, UCP_BINK_FILENAME),
                true,
              )
            ).throwIfErr();
            createStatusToast(ToastType.SUCCESS, 'overview.uninstall.success');
          } catch (e: unknown) {
            createStatusToast(ToastType.ERROR, String(e));
          }
        }}
        tooltip="overview.uninstall.tooltip"
        toastTitle="overview.uninstall.toast.title"
      />
      <div id="decor" />
      <NewsHighlights />
    </div>
  );
}
