import { useCurrentGameFolder } from 'components/general/hooks';
import StateButton from 'components/general/state-button';
import {
  UCPStateHandler,
  useUCPState,
  useUCPVersion,
} from 'components/general/swr-hooks';
import RecentFolders from 'components/ucp-tabs/recent-folders';
import { checkForGUIUpdates } from 'function/download/gui-update';
import {
  checkForUCP3Updates,
  installUCPFromZip,
} from 'function/download/ucp-download-handling';
import { UCPState } from 'function/ucp/ucp-state';
import { UCPVersion } from 'function/ucp/ucp-version';
import { reloadCurrentWindow } from 'function/window-actions';
import { useState } from 'react';
import { Button, Container, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { openFileDialog } from 'tauri/tauri-dialog';
import Result from 'util/structs/result';
import './overview.css';
import '../../components.css';

export default function Overview() {
  const currentFolder = useCurrentGameFolder();
  const ucpStateHandlerSwr = useUCPState();
  const ucpVersionSwr = useUCPVersion();

  const [overviewButtonActive, setOverviewButtonActive] = useState(true);

  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);

  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-download']);

  if (ucpStateHandlerSwr.isLoading || ucpVersionSwr.isLoading) {
    return <p>{t('gui-general:loading')}</p>;
  }
  const ucpStateHandler = ucpStateHandlerSwr.data as UCPStateHandler;
  const ucpState = ucpStateHandler.state;
  const ucpVersion = ucpVersionSwr.data as UCPVersion;

  let activateButtonString;
  let ucpVersionString;
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
  return (
    <Container fluid className="overflow-auto">
      <RecentFolders />
      <div className="m-3">
        {t('gui-editor:overview.folder.version')} {ucpVersionString}
      </div>
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
        buttonVariant="primary"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async () => {
          let result = Result.emptyOk<string>();
          if (ucpState === UCPState.ACTIVE) {
            result = (await ucpStateHandler.deactivate()).mapErr(String);
          } else if (ucpState === UCPState.INACTIVE) {
            result = (await ucpStateHandler.activate()).mapErr(String);
          }
          return result;
        }}
      />
      <StateButton
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
            await ucpStateHandlerSwr.mutate();
            await ucpVersionSwr.mutate();

            return Result.ok('');
          }
          return Result.emptyErr();
        }}
      />
      <StateButton
        buttonActive={overviewButtonActive}
        buttonValues={{
          idle: t('gui-editor:overview.zip.idle'),
          running: t('gui-editor:overview.zip.running'),
          success: t('gui-editor:overview.zip.success'),
          failed: t('gui-editor:overview.zip.failed'),
        }}
        buttonVariant="primary"
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
            await ucpStateHandlerSwr.mutate();
            await ucpVersionSwr.mutate();
            setShow(true);
          }
          setOverviewButtonActive(true);
          return zipInstallResult.mapOk(() => '').mapErr((err) => String(err));
        }}
      />
      <StateButton
        buttonActive={false}
        buttonValues={{
          idle: t('gui-editor:overview.uninstall.idle'),
          running: t('gui-editor:overview.uninstall.running'),
          success: t('gui-editor:overview.uninstall.success'),
          failed: t('gui-editor:overview.uninstall.failed'),
        }}
        buttonVariant="primary"
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
        buttonVariant="primary"
        funcBefore={() => setOverviewButtonActive(false)}
        funcAfter={() => setOverviewButtonActive(true)}
        func={async (stateUpdate) =>
          Result.tryAsync(() => checkForGUIUpdates(stateUpdate, t))
        }
      />
      <div className="m-5">
        <Modal show={show} onHide={handleClose} className="text-dark">
          <Modal.Header closeButton>
            <Modal.Title>{t('gui-general:require.reload.title')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {t('gui-editor:overview.require.reload.text')}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              {t('gui-general:close')}
            </Button>
            <Button
              variant="primary"
              onClick={(event) => {
                handleClose();
                reloadCurrentWindow();
              }}
            >
              {t('gui-general:reload')}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Container>
  );
}
