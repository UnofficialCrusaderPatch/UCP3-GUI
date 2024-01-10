import './overview.css';

import { useAtomValue } from 'jotai';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { installUCPFromZip } from '../../../function/installation/install-ucp-from-zip';
import { UCP_VERSION_ATOM } from '../../../function/ucp-files/ucp-version';
import { UCP3Updater } from '../../../function/download/github';
import { getStore } from '../../../hooks/jotai/base';
import { removeFile, writeBinaryFile } from '../../../tauri/tauri-files';
import { checkForGUIUpdates } from '../../../function/download/gui-update';
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
import { makeToast } from '../../modals/toasts/toasts-display';
import RecentFolders from './recent-folders';
import StateButton from '../../general/state-button';

function createToastHandler(title: string) {
  return (body: ReactNode) => {
    if (body == null) {
      // ignore if body null or undefined
      return;
    }
    makeToast({ title, body });
  };
}

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

      <StateButton
        buttonActive={overviewButtonActive}
        buttonValues={{
          idle: t('gui-editor:overview.update.idle'),
          running: t('gui-editor:overview.update.running'),
          success: t('gui-editor:overview.update.success'),
          failed: t('gui-editor:overview.update.failed'),
        }}
        buttonVariant="ucp-button overview__text-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (stateUpdate) => {
          try {
            stateUpdate(t('gui-download:ucp.version.check'));

            const vr = await getStore().get(UCP_VERSION_ATOM);
            let version = '0.0.0';
            let sha = '';
            if (vr.status === 'ok') {
              version = `${vr.version.getMajorAsString()}.${vr.version.getMinorAsString()}.${vr.version.getPatchAsString()}`;
              sha = vr.version!.sha.getOrElse('!');
            }

            const updater = new UCP3Updater(version, sha, new Date(0));

            const updateExists = await updater.doesUpdateExist();
            if (updateExists) {
              stateUpdate('Update is available!');
            } else {
              return Result.ok(t('gui-download:ucp.version.not.available'));
            }

            const dialogResult = await showModalOkCancel({
              title: t('gui-general:confirm'),
              message: t('gui-download:ucp.download.request', {
                version: updater.meta!.version,
              }),
            });

            if (dialogResult !== true) {
              return Result.err(t('gui-download:ucp.download.cancelled'));
            }

            stateUpdate(t('gui-download:ucp.download.download'));
            const update = await updater.fetchUpdate();

            stateUpdate(`Downloaded update: ${update.name}`);

            const gameFolderState = getStore().get(GAME_FOLDER_LOADED_ATOM);

            if (gameFolderState.state !== 'hasData') {
              stateUpdate(
                'Game folder in bad state. Cannot save update to disk.',
              );
              return Result.emptyErr();
            }
            const gameFolder = gameFolderState.data;
            const path = `${gameFolder}/${update.name}`;
            stateUpdate(`Saving update to game folder: ${update.name}`);
            await writeBinaryFile(path, update.data);

            stateUpdate(`Installing update to game folder`);
            const installResult = await installUCPFromZip(
              path,
              gameFolder,
              stateUpdate,
              t,
            );

            if (installResult.isErr()) {
              installResult
                .err()
                .ifPresent((error) =>
                  stateUpdate(t('gui-download:ucp.install.failed', { error })),
                );
              return Result.err(installResult.err().get());
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

            return Result.ok('Update finished');
          } catch (e: any) {
            return Result.err(e);
          }
        }}
        setResultNodeState={createToastHandler(
          t('gui-editor:overview.update.toast.title'),
        )}
      />
      <StateButton
        buttonActive={overviewButtonActive}
        buttonValues={{
          idle: t('gui-editor:overview.zip.idle'),
          running: t('gui-editor:overview.zip.running'),
          success: t('gui-editor:overview.zip.success'),
          failed: t('gui-editor:overview.zip.failed'),
        }}
        buttonVariant="zip-icon icon-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (stateUpdate) => {
          try {
            setOverviewButtonActive(false);
            const zipFilePath = await openFileDialog(currentFolder, [
              { name: t('gui-general:file.zip'), extensions: ['zip'] },
              { name: t('gui-general:file.all'), extensions: ['*'] },
            ]);

            if (zipFilePath.isEmpty()) return Result.emptyErr();

            // TODO: improve feedback
            const zipInstallResult = await installUCPFromZip(
              zipFilePath.get(),
              currentFolder,
              // can be used to transform -> although splitting into more components might be better
              (status) => stateUpdate(status),
              t,
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
            setOverviewButtonActive(true);
            return zipInstallResult
              .mapOk(() => '')
              .mapErr((err) => String(err));
          } catch (e: any) {
            await showModalOk({ message: e.toString(), title: 'ERROR' });
          }

          return Result.emptyErr();
        }}
        setResultNodeState={createToastHandler(
          t('gui-editor:overview.zip.toast.title'),
        )}
      />
      <StateButton
        buttonActive={
          overviewButtonActive &&
          (ucpState === UCPState.ACTIVE ||
            ucpState === UCPState.INACTIVE ||
            ucpState === UCPState.BINK_UCP_MISSING ||
            ucpState === UCPState.BINK_REAL_COPY_MISSING ||
            ucpState === UCPState.BINK_VERSION_DIFFERENCE)
        }
        buttonValues={{
          idle: activateButtonString,
          running: activateButtonString,
          success: activateButtonString,
          failed: activateButtonString,
        }}
        buttonVariant="ucp-button overview__text-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async () => {
          try {
            let result = Result.emptyOk<string>();
            if (
              ucpState === UCPState.ACTIVE ||
              ucpState === UCPState.BINK_UCP_MISSING ||
              ucpState === UCPState.BINK_VERSION_DIFFERENCE
            ) {
              result = (await deactivateUCP()).mapErr(String);
            } else if (
              ucpState === UCPState.INACTIVE ||
              ucpState === UCPState.BINK_REAL_COPY_MISSING
            ) {
              result = (await activateUCP()).mapErr(String);
            }
            return result;
          } catch (e: any) {
            await showModalOk({ message: e.toString(), title: 'ERROR' });
          }

          return Result.emptyOk();
        }}
        tooltip={t('gui-editor:overview.activationTooltip')}
        setResultNodeState={createToastHandler(
          t('gui-editor:overview.activate.toast.title'),
        )}
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
      <StateButton
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
      />
    </div>
  );
}
