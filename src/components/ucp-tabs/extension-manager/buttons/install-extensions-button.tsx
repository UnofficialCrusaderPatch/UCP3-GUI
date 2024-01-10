import { exists, t } from 'i18next';
import { useSetAtom } from 'jotai';
import { PlusLg } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import ExtensionPack from '../../../../function/extensions/pack/extension-pack';
import { LOGGER } from '../../../../function/game-folder/initialization';
import { useCurrentGameFolder } from '../../../../function/game-folder/state';
import { openFileDialog } from '../../../../tauri/tauri-dialog';

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
          const result = await openFileDialog(gameFolder, [
            { name: 'Zip files', extensions: ['zip'] },
          ]);
          if (result.isPresent()) {
            const path = result.get();

            LOGGER.msg(`Trying to install extensions from: ${path}`).info();

            if (await exists(path)) {
              try {
                const ep = await ExtensionPack.fromPath(path);

                try {
                  await ep.install(`${gameFolder}/ucp`);
                  await showModalOk({
                    title: 'Succesful install',
                    message: `Extension pack was succesfully installed`,
                  });
                } catch (e) {
                  let msg = e;
                  if (typeof e === 'string') {
                    msg = e.toString(); // works, `e` narrowed to string
                  } else if (e instanceof Error) {
                    msg = e.message; // works, `e` narrowed to Error
                  }
                  await showModalOk({
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
                await showModalOk({
                  title: 'ERROR',
                  message: (msg as string).toString(),
                });
              }
            } else {
              LOGGER.msg(`Path does not exist: ${path}`).warn();
              await showModalOk({
                title: 'Path does not exist',
                message: `Path does not exist: ${path}`,
              });
            }
          }
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
