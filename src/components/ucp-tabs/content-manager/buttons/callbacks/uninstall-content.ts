import { ContentElement } from '../../../../../function/content/types/content-element';
import { GAME_FOLDER_ATOM } from '../../../../../function/game-folder/game-folder-atom';
import { getStore } from '../../../../../hooks/jotai/base';
import { removeDir } from '../../../../../tauri/tauri-files';
import { CONTENT_INSTALLATION_STATUS_ATOM } from '../../state/downloads/download-progress';

export const uninstallPlugin = async (plugin: ContentElement) => {
  const gameFolder = getStore().get(GAME_FOLDER_ATOM);
  const path = `${gameFolder}/ucp/plugins/${plugin.definition.name}-${plugin.definition.version}`;
  const removeResult = await removeDir(path, true);

  return removeResult.isOk();
};

// eslint-disable-next-line import/prefer-default-export
export const uninstallContents = (contentElements: ContentElement[]) => {
  contentElements
    .filter((ce) => ce.definition.type === 'plugin')
    .forEach(async (ce) => {
      const id = `${ce.definition.name}@${ce.definition.version}`;

      const contentDownloadProgressDB = getStore().get(
        CONTENT_INSTALLATION_STATUS_ATOM,
      );

      contentDownloadProgressDB[id] = {
        action: 'uninstall',
        progress: 30,
        name: ce.definition.name,
        version: ce.definition.version,
      };
      getStore().set(CONTENT_INSTALLATION_STATUS_ATOM, {
        ...contentDownloadProgressDB,
      });

      try {
        const uninstallResult = await uninstallPlugin(ce);

        if (!uninstallResult) {
          contentDownloadProgressDB[id] = {
            action: 'error',
            message: `Failed to remove this content`,
            name: ce.definition.name,
            version: ce.definition.version,
          };
          getStore().set(CONTENT_INSTALLATION_STATUS_ATOM, {
            ...contentDownloadProgressDB,
          });
          return;
        }
      } catch (e: any) {
        contentDownloadProgressDB[id] = {
          action: 'error',
          message: `${e.toString()}`,
          name: ce.definition.name,
          version: ce.definition.version,
        };
        getStore().set(CONTENT_INSTALLATION_STATUS_ATOM, {
          ...contentDownloadProgressDB,
        });
        return;
      }

      contentDownloadProgressDB[id] = {
        action: 'complete',
        name: ce.definition.name,
        version: ce.definition.version,
      };
      getStore().set(CONTENT_INSTALLATION_STATUS_ATOM, {
        ...contentDownloadProgressDB,
      });
    });
};
