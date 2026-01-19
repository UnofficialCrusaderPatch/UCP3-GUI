import { Event } from '@tauri-apps/api/event';
import { atom } from 'jotai';
import { getStore } from '../../../../hooks/jotai/base';
import { ConsoleLogger } from '../../../../util/scripts/logging';
import { showModalOk } from '../../../modals/modal-ok';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { makeToast } from '../../../toasts/toasts-display';
import { CURRENT_DISPLAYED_TAB } from '../../tabs-state';
import { installExtensionsButtonCallback } from '../buttons/install-extensions-button';
import { GAME_FOLDER_ATOM } from '../../../../function/game-folder/interface';
import { reloadCurrentGameFolder } from '../../../../function/game-folder/modifications/reload-current-game-folder';

export const IS_FILE_DRAGGING = atom(false); // const HANDLED_DROP_EVENTS = atom<{ [id: number]: boolean }>({});
export async function handleFileDrop(event: Event<unknown>) {
  ConsoleLogger.debug('Drop event? ', event);
  if (event.event !== 'tauri://file-drop') {
    ConsoleLogger.debug('Non drop event: ', event);
    getStore().set(IS_FILE_DRAGGING, false);
    return;
  }
  if (
    getStore().get(CURRENT_DISPLAYED_TAB) === 'extensions' &&
    getStore().get(IS_FILE_DRAGGING) === true
  ) {
    getStore().set(IS_FILE_DRAGGING, false);
    ConsoleLogger.debug('Drop event: ', event);
    try {
      let anythingInstalled = false;
      // eslint-disable-next-line no-restricted-syntax
      for (const path of event.payload as string[]) {
        // eslint-disable-next-line no-await-in-loop
        const answer = await showModalOkCancel({
          title: 'extensions.install.dragdrop.confirmation.title',
          message: {
            key: 'extensions.install.dragdrop.confirmation.message',
            args: {
              path,
            },
          },
        });
        // eslint-disable-next-line no-continue
        if (!answer) continue;

        makeToast({
          title: `extensions.install.dragdrop.installing.toast.title`,
          body: `extensions.install.dragdrop.installing.toast.message`,
        });

        // eslint-disable-next-line no-await-in-loop
        const installResult = await installExtensionsButtonCallback(
          getStore().get(GAME_FOLDER_ATOM),
          path,
        );

        // makeToast({
        //   title: `Installed!`,
        //   body: `Installation of extension complete`,
        // });
        if (installResult === true) anythingInstalled = true;
      }

      if (anythingInstalled) {
        await showModalOk({
          title: 'require.reload.title',
          message: 'require.reload.message',
        });

        reloadCurrentGameFolder();
      }
    } catch (err: unknown) {
      ConsoleLogger.error(err);
    }
  }
}
