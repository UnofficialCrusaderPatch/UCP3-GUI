import { ContentElement } from '../../../../../function/content/types/content-element';
import { GAME_FOLDER_ATOM } from '../../../../../function/game-folder/game-folder-atom';
import { getStore } from '../../../../../hooks/jotai/base';
import { removeDir } from '../../../../../tauri/tauri-files';
import { contentInstallationStatusAtoms } from '../../state/atoms';
import { ContentInstallationStatus } from '../../state/downloads/download-progress';

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

      const setStatus = (value: ContentInstallationStatus) => {
        getStore().set(contentInstallationStatusAtoms[id], value);
      };

      setStatus({
        action: 'uninstall',
        progress: 30,
        name: ce.definition.name,
        version: ce.definition.version,
      });

      try {
        const uninstallResult = await uninstallPlugin(ce);

        if (!uninstallResult) {
          setStatus({
            action: 'error',
            message: `Failed to remove this content`,
            name: ce.definition.name,
            version: ce.definition.version,
          });
          return;
        }
      } catch (e: any) {
        setStatus({
          action: 'error',
          message: `${e.toString()}`,
          name: ce.definition.name,
          version: ce.definition.version,
        });
        return;
      }

      // eslint-disable-next-line no-param-reassign
      ce.installed = false;

      setStatus({
        action: 'idle',
        name: ce.definition.name,
        version: ce.definition.version,
      });
    });
};
