import { FileEntry, exists, readDir } from '@tauri-apps/api/fs';
import { useAtomValue, useSetAtom } from 'jotai';
import { Stack } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import { saveFileDialog } from '../../../../tauri/tauri-dialog';
import Logger from '../../../../util/scripts/logging';
import { ZipWriter } from '../../../../util/structs/zip-handler';
import { makeToast } from '../../../toasts/toasts-display';
import {
  UCP_MODULES_FOLDER,
  UCP_PLUGINS_FOLDER,
} from '../../../../function/global/constants/file-constants';

const LOGGER = new Logger('create-extensions-pack.tsx');

// eslint-disable-next-line import/prefer-default-export
export function CreateExtensionsPackButton() {
  const gameFolder = useCurrentGameFolder();

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const pathPrefix = `${gameFolder}/ucp/`;
  function makeRelative(fe: FileEntry) {
    if (!fe.path.startsWith(pathPrefix)) {
      throw Error(fe.path);
    }

    return fe.path.substring(pathPrefix.length);
  }

  return (
    <button
      type="button"
      className="ucp-button ucp-button--square text-light"
      onClick={async () => {
        try {
          LOGGER.msg('Creating modpack').trace();

          const filePathResult = await saveFileDialog(
            `${gameFolder}`,
            [{ name: 'Zip file', extensions: ['*.zip'] }],
            'Save pack as...',
          );

          if (filePathResult.isEmpty()) return;

          const filePath = filePathResult.get();

          const zw: ZipWriter = await ZipWriter.open(filePath);
          try {
            zw.addDirectory('modules');
            zw.addDirectory('plugins');
            // eslint-disable-next-line no-restricted-syntax
            for (const ext of extensionsState.activeExtensions) {
              const fpath = `${ext.name}-${ext.version}`;

              let originalPath = '';
              if (ext.type === 'plugin') {
                originalPath = `${gameFolder}/${UCP_PLUGINS_FOLDER}${fpath}`;
                // eslint-disable-next-line no-await-in-loop
                const touch = await exists(originalPath);

                if (!touch) {
                  // eslint-disable-next-line no-await-in-loop
                  await showModalOk({
                    title: 'Error',
                    message: `Path does not exist: ${originalPath}`,
                  });
                  return;
                }

                // eslint-disable-next-line no-await-in-loop
                const entries = await readDir(originalPath, {
                  recursive: true,
                });

                const dirs = entries
                  .filter(
                    (fe) => fe.children !== undefined && fe.children !== null,
                  )
                  .map(makeRelative);

                // eslint-disable-next-line no-restricted-syntax
                for (const dir of dirs) {
                  // eslint-disable-next-line no-await-in-loop
                  await zw.addDirectory(dir);
                }

                const files = entries.filter(
                  (fe) => fe.children === undefined || fe.children === null,
                );

                // eslint-disable-next-line no-restricted-syntax
                for (const fe of files) {
                  // eslint-disable-next-line no-await-in-loop
                  await zw.writeEntryFromFile(makeRelative(fe), fe.path);
                }
              } else if (ext.type === 'module') {
                originalPath = `${gameFolder}/${UCP_MODULES_FOLDER}${fpath}.zip`;
                const dstPath = `modules/${fpath}.zip`;

                // eslint-disable-next-line no-await-in-loop
                const touch = await exists(originalPath);

                if (!touch) {
                  // eslint-disable-next-line no-await-in-loop
                  await showModalOk({
                    title: 'Error',
                    message: `Path does not exist: ${originalPath}`,
                  });
                  return;
                }

                // eslint-disable-next-line no-await-in-loop
                await zw.writeEntryFromFile(dstPath, originalPath);
              } else {
                throw Error('What are we doing here?');
              }
            }
          } catch (e) {
            LOGGER.obj(e).error();
            await showModalOk({
              title: 'Error',
              message: (e as Error).toString(),
            });
          } finally {
            zw.close();
          }
        } catch (e: unknown) {
          await showModalOk({
            title: 'ERROR',
            message: String(e),
          });
        }

        await makeToast({ title: 'Extension pack created!', body: '' });
      }}
      onMouseEnter={() => {
        setStatusBarMessage('config.tooltip.pack');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <Stack />
    </button>
  );
}
