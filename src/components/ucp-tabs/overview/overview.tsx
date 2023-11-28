import './overview.css';

import StateButton from 'components/general/state-button';
import { checkForGUIUpdates } from 'function/download/gui-update';
import { installUCPFromZip } from 'function/download/ucp-download-handling';
import {
  LOADABLE_UCP_STATE_ATOM,
  UCPState,
  activateUCP,
  deactivateUCP,
} from 'function/ucp-files/ucp-state';
import { reloadCurrentWindow } from 'function/window-actions';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openFileDialog } from 'tauri/tauri-dialog';
import Result from 'util/structs/result';
import { useCurrentGameFolder, useUCPVersion } from 'hooks/jotai/helper';
import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';
import { showGeneralModalOk } from 'components/modals/ModalOk';
import { useAtomValue } from 'jotai';
import RecentFolders from './recent-folders';

export default function Overview() {
  const currentFolder = useCurrentGameFolder();
  const loadableUcpState = useAtomValue(LOADABLE_UCP_STATE_ATOM);
  const [, receiveVersion] = useUCPVersion();

  const [overviewButtonActive, setOverviewButtonActive] = useState(true);
  const [buttonResult, setButtonResult] = useState<ReactNode>(null);

  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-download']);

  const ucpStatePresent = loadableUcpState.state === 'hasData';
  const ucpState = ucpStatePresent ? loadableUcpState.data : UCPState.UNKNOWN;
  let activateButtonString = null;
  if (!ucpStatePresent) {
    activateButtonString = t('gui-general:loading');
  } else {
    switch (ucpState) {
      case UCPState.NOT_INSTALLED:
        activateButtonString = t('gui-editor:overview.activate.not.installed');
        break;
      case UCPState.ACTIVE:
        activateButtonString = t('gui-editor:overview.activate.do.deactivate');
        break;
      case UCPState.INACTIVE:
        activateButtonString = t('gui-editor:overview.activate.do.activate');
        break;
      case UCPState.WRONG_FOLDER:
        activateButtonString = t('gui-editor:overview.wrong.folder');
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
        buttonActive={
          overviewButtonActive &&
          (ucpState === UCPState.ACTIVE || ucpState === UCPState.INACTIVE)
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
            if (ucpState === UCPState.ACTIVE) {
              result = (await deactivateUCP()).mapErr(String);
            } else if (ucpState === UCPState.INACTIVE) {
              result = (await activateUCP()).mapErr(String);
            }
            return result;
          } catch (e: any) {
            await showGeneralModalOk({ message: e.toString(), title: 'ERROR' });
          }

          return Result.emptyOk();
        }}
        tooltip={t('gui-editor:overview.activationTooltip')}
        setResultNodeState={setButtonResult}
      />

      {/*      <StateButton
        buttonActive={overviewButtonActive}
        buttonValues={{
          idle: t('gui-editor:overview.update.idle'),
          running: t('gui-editor:overview.update.running'),
          success: t('gui-editor:overview.update.success'),
          failed: t('gui-editor:overview.update.failed'),
        }}
        buttonVariant="primary"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (stateUpdate) => {
          const updateResult = await checkForUCP3Updates(
            currentFolder,
            (status) => stateUpdate(status),
            t
          );
          if (updateResult.update === true && updateResult.installed === true) {
            setShow(true);

            // load new state
            await receiveState();
            await receiveVersion();

            return Result.ok('');
          }
          return Result.emptyErr();
        }}
      /> */}
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

            if (zipFilePath.isEmpty()) return Result.err('');

            // TODO: improve feedback
            const zipInstallResult = await installUCPFromZip(
              zipFilePath.get(),
              currentFolder,
              // can be used to transform -> although splitting into more components might be better
              (status) => stateUpdate(status),
              t,
            );
            if (zipInstallResult.ok().isPresent()) {
              // load new state
              await receiveVersion();

              const confirmed = await showGeneralModalOkCancel({
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
            await showGeneralModalOk({ message: e.toString(), title: 'ERROR' });
          }

          return Result.emptyErr();
        }}
        setResultNodeState={setButtonResult}
      />
      <div id="decor" />
      <StateButton
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
        setResultNodeState={setButtonResult}
      />
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
            await showGeneralModalOk({ message: e.toString(), title: 'ERROR' });
          }

          return Result.emptyErr();
        }}
        setResultNodeState={setButtonResult}
      />
      {buttonResult}
    </div>
  );
}
