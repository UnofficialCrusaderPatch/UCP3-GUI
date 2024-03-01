import { t } from 'i18next';
import { useSetAtom } from 'jotai';
import { PlusLg } from 'react-bootstrap-icons';
import { exists } from '@tauri-apps/api/fs';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import ExtensionPack from '../../../../function/extensions/installation/extension-pack';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import { openFileDialog } from '../../../../tauri/tauri-dialog';
import Logger from '../../../../util/scripts/logging';
import { installExtension } from '../../../../function/extensions/installation/install-module';
import { reloadCurrentWindow } from '../../../../function/window-actions';
import { ToastType, makeToast } from '../../../toasts/toasts-display';

const LOGGER = new Logger('install-extensions-button.tsx');

export const installExtensionsButtonCallback = async (
  gameFolder: string,
  location?: string,
) => {
  let path = location;
  if (location === undefined) {
    const result = await openFileDialog(gameFolder, [
      { name: 'Zip files', extensions: ['zip'] },
    ]);
    if (!result.isPresent()) {
      return;
    }

    path = result.get();
  }

  if (path === undefined) return;

  LOGGER.msg(`Trying to install extensions from: ${path}`).info();

  if (await exists(path)) {
    try {
      if (await ExtensionPack.isPack(path)) {
        const ep = await ExtensionPack.fromPath(path);

        try {
          await ep.install(`${gameFolder}/ucp`);
          makeToast({
            title: 'Succesful install',
            body: `Extension pack was succesfully installed`,
            type: ToastType.SUCCESS,
          });
        } catch (e: any) {
          await showModalOk({
            title: 'ERROR',
            message: e.toString(),
          });
        } finally {
          await ep.close();
        }
      } else {
        try {
          await installExtension(gameFolder, path);

          makeToast({
            title: 'Succesful install',
            body: `Extension was succesfully installed`,
            type: ToastType.SUCCESS,
          });
        } catch (e: any) {
          await showModalOk({
            title: 'ERROR',
            message: e.toString(),
          });
        }
      }
    } catch (e: any) {
      await showModalOk({
        title: 'ERROR',
        message: e.toString(),
      });
    }
  } else {
    LOGGER.msg(`Path does not exist: ${path}`).warn();
    await showModalOk({
      title: 'Path does not exist',
      message: `Path does not exist: ${path}`,
    });
  }
};

// eslint-disable-next-line import/prefer-default-export
export function InstallExtensionButton() {
  const gameFolder = useCurrentGameFolder();

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  return (
    <button
      type="button"
      className="ucp-button ucp-button--square text-light"
      onClick={async () => {
        try {
          await installExtensionsButtonCallback(gameFolder);

          await showModalOk({
            title: 'Reload required',
            message: 'The GUI will now reload.',
          });

          reloadCurrentWindow();
        } catch (e: any) {
          await showModalOk({
            title: 'ERROR',
            message: e.toString(),
          });
        }
      }}
      onMouseEnter={() => {
        setStatusBarMessage(t('gui-editor:config.tooltip.install'));
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <PlusLg />
    </button>
  );
}
