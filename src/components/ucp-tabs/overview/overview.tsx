import StateButton from 'components/general/state-button';
import { checkForGUIUpdates } from 'function/download/gui-update';
import {
  checkForUCP3Updates,
  installUCPFromZip,
} from 'function/download/ucp-download-handling';
import { UCPState } from 'function/ucp-files/ucp-state';
import { reloadCurrentWindow } from 'function/window-actions';
import { useState } from 'react';
import { Button, Container, Form, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { openFileDialog, openFolderDialog } from 'tauri/tauri-dialog';
import Result from 'util/structs/result';
import {
  useCurrentGameFolder,
  useUCPState,
  useUCPVersion,
} from 'hooks/jotai/helper';
import { useGeneralOkayCancelModalWindowReducer } from 'hooks/jotai/globals-wrapper';
import { useAtom } from 'jotai';
import { confirm } from '@tauri-apps/api/dialog';
import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';

import * as GuiSettings from 'function/global/gui-settings/guiSettings';

import './overview.css';

import { GENERAL_OK_MODAL_WINDOW_REDUCER_ATOM } from 'function/global/global-atoms';
import { exists } from '@tauri-apps/api/fs';
import { warn } from 'util/scripts/logging';
import ExtensionPack from 'function/extensions/extension-pack';
import { showGeneralModalOk } from 'components/modals/ModalOk';
import RecentFolders from './recent-folders';

export default function Overview() {
  const currentFolder = useCurrentGameFolder();
  const [ucpStateHandlerResult, receiveState] = useUCPState();
  const [ucpVersionResult, receiveVersion] = useUCPVersion();

  const [overviewButtonActive, setOverviewButtonActive] = useState(true);

  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-download']);

  const [generalOkayCancelModalWindow, setGeneralOkayCancelModalWindow] =
    useGeneralOkayCancelModalWindowReducer();

  const ucpStateHandler = ucpStateHandlerResult
    .getOrReceive(Result.emptyErr)
    .ok();
  const ucpState = ucpStateHandler
    .map((handler) => handler.state)
    .getOrElse(UCPState.UNKNOWN);

  let activateButtonString = null;
  let ucpVersionString = null;
  if (ucpVersionResult.isEmpty()) {
    ucpVersionString = t('gui-general:loading');
    activateButtonString = ucpVersionString;
  } else {
    const ucpVersion = ucpVersionResult.get().getOrThrow();
    switch (ucpState) {
      case UCPState.NOT_INSTALLED:
        ucpVersionString = t('gui-editor:overview.not.installed');
        activateButtonString = t('gui-editor:overview.activate.not.installed');
        break;
      case UCPState.ACTIVE:
        ucpVersionString = ucpVersion.toString();
        activateButtonString = t('gui-editor:overview.activate.do.deactivate');
        break;
      case UCPState.INACTIVE:
        ucpVersionString = ucpVersion.toString();
        activateButtonString = t('gui-editor:overview.activate.do.activate');
        break;
      default:
        ucpVersionString = t('gui-editor:overview.unknown.state');
        activateButtonString = t('gui-editor:overview.activate.unknown');
        break;
    }
  }

  const [advancedMode, setAdvancedMode] = useAtom(
    GuiSettings.ADVANCED_MODE_ATOM
  );

  const [, setGeneralOkModalWindow] = useAtom(
    GENERAL_OK_MODAL_WINDOW_REDUCER_ATOM
  );

  return (
    <Container fluid className="overflow-auto overview-background-image ">
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
        buttonVariant="ucp-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async () => {
          let result = Result.emptyOk<string>();
          if (ucpStateHandler.isEmpty()) {
            return result;
          }

          if (ucpState === UCPState.ACTIVE) {
            result = (await ucpStateHandler.get().deactivate()).mapErr(String);
          } else if (ucpState === UCPState.INACTIVE) {
            result = (await ucpStateHandler.get().activate()).mapErr(String);
          }
          return result;
        }}
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
            t
          );
          if (zipInstallResult.ok().isPresent()) {
            // load new state
            await receiveState();
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
          return zipInstallResult.mapOk(() => '').mapErr((err) => String(err));
        }}
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
        buttonVariant="ucp-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (stateUpdate) => Result.emptyOk()}
      />
      <StateButton
        buttonActive={overviewButtonActive}
        buttonValues={{
          idle: t('gui-editor:overview.update.gui.idle'),
          running: t('gui-editor:overview.update.gui.running'),
          success: t('gui-editor:overview.update.gui.success'),
          failed: t('gui-editor:overview.update.gui.failed'),
        }}
        buttonVariant="ucp-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (stateUpdate) =>
          Result.tryAsync(() => checkForGUIUpdates(stateUpdate, t))
        }
      />
      <div className="m-2 ">
        <Form
          style={{
            verticalAlign: 'center',
            height: '40px',
            minWidth: '100px',
            width: '40%',
            marginLeft: '31%',
            marginRight: '30%',
            position: 'relative',
          }}
        >
          <Form.Switch
            id="gui-settings-advanced-mode-switch"
            label={t('gui-general:advanced.mode')}
            checked={advancedMode as boolean}
            onChange={(e) => {
              if (e.target.checked !== advancedMode) {
                setAdvancedMode(e.target.checked);
              }
            }}
          />
        </Form>
      </div>
      <StateButton
        buttonActive={overviewButtonActive}
        buttonValues={{
          idle: 'Install extensions from zip file',
          running: 'Installing...',
          success: 'Installed extension pack!',
          failed: 'Failed to install extension pack',
        }}
        buttonVariant="ucp-button"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (stateUpdate) =>
          Result.tryAsync(async () => {
            const result = await openFileDialog(currentFolder, [
              { name: 'Zip files', extensions: ['zip'] },
            ]);

            if (result.isPresent()) {
              const path = result.get();

              console.log(`Trying to install extensions from: ${path}`);

              if (await exists(path)) {
                try {
                  const ep = await ExtensionPack.fromPath(path);

                  try {
                    await ep.install(`${currentFolder}/ucp`);
                    stateUpdate('success');
                  } catch (e) {
                    let msg = e;
                    if (typeof e === 'string') {
                      msg = e.toString(); // works, `e` narrowed to string
                    } else if (e instanceof Error) {
                      msg = e.message; // works, `e` narrowed to Error
                    }
                    await showGeneralModalOk({
                      title: 'ERROR',
                      message: (msg as string).toString(),
                    });
                  } finally {
                    await ep.close();
                  }
                } catch (e) {
                  let msg = e;
                  if (typeof e === 'string') {
                    msg = e.toString(); // works, `e` narrowed to string
                  } else if (e instanceof Error) {
                    msg = e.message; // works, `e` narrowed to Error
                  }
                  await showGeneralModalOk({
                    title: 'ERROR',
                    message: (msg as string).toString(),
                  });
                }
              } else {
                warn(`Path does not exist: ${path}`);
                stateUpdate(`Path does not exist: ${path}`);
              }
            }
          })
        }
      />
    </Container>
  );
}
