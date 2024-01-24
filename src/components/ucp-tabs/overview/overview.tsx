import './overview.css';

import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { installUCPFromZip } from '../../../function/installation/install-ucp-from-zip';
import { UCP_VERSION_ATOM } from '../../../function/ucp-files/ucp-version';
import { UCP3Updater } from '../../../function/download/github';
import { getStore } from '../../../hooks/jotai/base';
import { removeFile, writeBinaryFile } from '../../../tauri/tauri-files';
import {
  LOADABLE_UCP_STATE_ATOM,
  UCPState,
  activateUCP,
  deactivateUCP,
} from '../../../function/ucp-files/ucp-state';
import { reloadCurrentWindow } from '../../../function/window-actions';

import { openFileDialog } from '../../../tauri/tauri-dialog';
import Result from '../../../util/structs/result';
import { showModalOkCancel } from '../../modals/modal-ok-cancel';
import { showModalOk } from '../../modals/modal-ok';
import {
  GAME_FOLDER_LOADED_ATOM,
  useCurrentGameFolder,
} from '../../../function/game-folder/state';
import RecentFolders from './recent-folders';
import OverviewButton from './overview-button';
import { ToastType } from '../../toasts/toasts-display';

export default function Overview() {
  const currentFolder = useCurrentGameFolder();
  const loadableUcpState = useAtomValue(LOADABLE_UCP_STATE_ATOM);

  const [overviewButtonActive, setOverviewButtonActive] = useState(true);

  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-download']);

  const ucpStatePresent = loadableUcpState.state === 'hasData';
  const ucpState = ucpStatePresent ? loadableUcpState.data : UCPState.UNKNOWN;
  let activateButtonString = null;
  if (!ucpStatePresent) {
    activateButtonString = t('gui-general:loading');
  } else {
    switch (ucpState) {
      case UCPState.NOT_INSTALLED:
      case UCPState.NOT_INSTALLED_WITH_REAL_BINK:
        activateButtonString = t('gui-editor:overview.activate.not.installed');
        break;
      case UCPState.ACTIVE:
      case UCPState.BINK_UCP_MISSING:
      case UCPState.BINK_VERSION_DIFFERENCE:
        activateButtonString = t('gui-editor:overview.activate.do.deactivate');
        break;
      case UCPState.INACTIVE:
      case UCPState.BINK_REAL_COPY_MISSING:
        activateButtonString = t('gui-editor:overview.activate.do.activate');
        break;
      case UCPState.WRONG_FOLDER:
        activateButtonString = t('gui-editor:overview.wrong.folder');
        break;
      case UCPState.INVALID:
        activateButtonString = t('gui-editor:overview.activate.invalid');
        break;
      default:
        activateButtonString = t('gui-editor:overview.activate.unknown');
        break;
    }
  }

  return (
    <div className="flex-default overview">
      <RecentFolders />

      <OverviewButton
        buttonActive={overviewButtonActive}
        buttonText={t('gui-editor:overview.update.idle')}
        buttonVariant="ucp-button overview__text-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (createStatusToast) => {
          try {
            const gameFolderState = getStore().get(GAME_FOLDER_LOADED_ATOM);

            if (gameFolderState.state !== 'hasData') {
              createStatusToast(
                ToastType.ERROR,
                'Game folder in bad state. Cannot save update to disk.', // TODO: needs localization
              );
              return;
            }
            const gameFolder = gameFolderState.data;

            createStatusToast(
              ToastType.INFO,
              t('gui-download:ucp.version.check'),
            );

            const vr = await getStore().get(UCP_VERSION_ATOM);
            let version = '0.0.0';
            let sha = '';
            if (vr.status === 'ok') {
              version = `${vr.version.getMajorAsString()}.${vr.version.getMinorAsString()}.${vr.version.getPatchAsString()}`;
              sha = vr.version!.sha.getOrElse('!');
            }

            const updater = new UCP3Updater(version, sha, new Date(0));

            if (await updater.doesUpdateExist()) {
              createStatusToast(
                ToastType.INFO,
                t('gui-download:ucp.version.available'),
              );
            } else {
              createStatusToast(
                ToastType.WARN,
                t('gui-download:ucp.version.not.available'),
              );
              return;
            }

            const dialogResult = await showModalOkCancel({
              title: t('gui-general:confirm'),
              message: t('gui-download:ucp.download.request', {
                version: updater.meta!.version,
              }),
            });

            if (dialogResult !== true) {
              createStatusToast(
                ToastType.WARN,
                t('gui-download:ucp.download.cancelled'),
              );
              return;
            }

            createStatusToast(
              ToastType.INFO,
              t('gui-download:ucp.download.download'),
            );
            const update = await updater.fetchUpdate();

            createStatusToast(
              ToastType.INFO,
              t(`gui-download:ucp.download.downloaded`, {
                version: `${update.name}`,
              }),
            );

            const path = `${gameFolder}/${update.name}`;
            await writeBinaryFile(path, update.data);

            createStatusToast(ToastType.INFO, t('gui-download:ucp.installing'));
            const installResult = await installUCPFromZip(
              path,
              gameFolder,
              createStatusToast,
            );

            if (installResult.isErr()) {
              installResult
                .err()
                .ifPresent((error) =>
                  createStatusToast(
                    ToastType.ERROR,
                    t('gui-download:ucp.install.failed', { error }),
                  ),
                );
              return;
            }

            // TODO: in the future, use a cache?
            const removeResult = await removeFile(path);
            if (removeResult.isErr()) {
              await showModalOk({
                message: t('gui-download:ucp.install.zip.remove.failed', {
                  error: removeResult.err().get(),
                }),
                title: 'Could not remove file',
              });
            }

            await showModalOk({
              title: 'Reload required',
              message: 'The GUI will now reload.',
            });

            reloadCurrentWindow();

            createStatusToast(
              ToastType.SUCCESS,
              t('gui-editor:overview.update.success'),
            );
          } catch (e: any) {
            createStatusToast(ToastType.ERROR, e.toString());
          }
        }}
        toastTitle={t('gui-editor:overview.update.toast.title')}
      />
      <OverviewButton
        buttonActive={overviewButtonActive}
        buttonText={t('gui-editor:overview.zip.idle')}
        buttonVariant="zip-icon icon-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (createStatusToast) => {
          try {
            const zipFilePath = await openFileDialog(currentFolder, [
              { name: t('gui-general:file.zip'), extensions: ['zip'] },
              { name: t('gui-general:file.all'), extensions: ['*'] },
            ]);

            if (zipFilePath.isEmpty()) {
              createStatusToast(
                ToastType.INFO,
                t('gui-editor:overview.zip.failed'),
              );
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
                title: t('gui-general:require.reload.title'),
                message: t('gui-editor:overview.require.reload.text'),
              });
              // const confirmed = await confirm(
              //   t('gui-editor:overview.require.reload.text'),
              //   { title: t('gui-general:require.reload.title'), type: 'warning' }
              // );

              if (confirmed) {
                reloadCurrentWindow();
              }
            }
            zipInstallResult
              .mapErr((err) => String(err))
              .consider(
                () =>
                  createStatusToast(
                    ToastType.SUCCESS,
                    t('gui-editor:overview.zip.success'),
                  ),
                (err) => createStatusToast(ToastType.ERROR, err),
              );
          } catch (e: any) {
            await showModalOk({ message: e.toString(), title: 'ERROR' });
          }
        }}
        toastTitle={t('gui-editor:overview.zip.toast.title')}
      />
      <OverviewButton
        buttonActive={
          overviewButtonActive &&
          (ucpState === UCPState.ACTIVE ||
            ucpState === UCPState.INACTIVE ||
            ucpState === UCPState.BINK_UCP_MISSING ||
            ucpState === UCPState.BINK_REAL_COPY_MISSING ||
            ucpState === UCPState.BINK_VERSION_DIFFERENCE)
        }
        buttonText={activateButtonString}
        buttonVariant="ucp-button overview__text-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (createStatusToast) => {
          try {
            let result = Result.emptyOk();
            if (
              ucpState === UCPState.ACTIVE ||
              ucpState === UCPState.BINK_UCP_MISSING ||
              ucpState === UCPState.BINK_VERSION_DIFFERENCE
            ) {
              result = await deactivateUCP();
            } else if (
              ucpState === UCPState.INACTIVE ||
              ucpState === UCPState.BINK_REAL_COPY_MISSING
            ) {
              result = await activateUCP();
            }
            result
              .err()
              .map(String)
              .ifPresent((err) => createStatusToast(ToastType.ERROR, err));
          } catch (e: any) {
            await showModalOk({ message: e.toString(), title: 'ERROR' });
          }
        }}
        tooltip={t('gui-editor:overview.activationTooltip')}
        toastTitle={t('gui-editor:overview.activate.toast.title')}
      />
      <div id="decor" />
      {/* <StateButton
        buttonActive={false}
        buttonValues={{
          idle: t('gui-editor:overview.uninstall.idle'),
          running: t('gui-editor:overview.uninstall.running'),
          success: t('gui-editor:overview.uninstall.success'),
          failed: t('gui-editor:overview.uninstall.failed'),
        }}
        buttonVariant="ucp-button overview__text-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async () => Result.emptyOk()}
        tooltip={t('gui-editor:overview.uninstallationToolTip')}
        setResultNodeState={createToastHandler(
          t('gui-editor:overview.uninstall.toast.title'),
        )}
      /> */}
      {/* <StateButton
        buttonActive={overviewButtonActive}
        buttonValues={{
          idle: t('gui-editor:overview.update.gui.idle'),
          running: t('gui-editor:overview.update.gui.running'),
          success: t('gui-editor:overview.update.gui.success'),
          failed: t('gui-editor:overview.update.gui.failed'),
        }}
        buttonVariant="ucp-button overview__text-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (stateUpdate) => {
          try {
            return await Result.tryAsync(() =>
              checkForGUIUpdates(stateUpdate, t),
            );
          } catch (e: any) {
            await showModalOk({ message: e.toString(), title: 'ERROR' });
          }

          return Result.emptyErr();
        }}
        setResultNodeState={createToastHandler(
          t('gui-editor:overview.update.gui.toast.title'),
        )}
      /> */}
    </div>
  );
}
