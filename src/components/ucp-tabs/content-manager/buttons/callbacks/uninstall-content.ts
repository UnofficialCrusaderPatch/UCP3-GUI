import { ContentElement } from '../../../../../function/content/types/content-element';
import { GAME_FOLDER_ATOM } from '../../../../../function/game-folder/game-folder-atom';
import { getStore } from '../../../../../hooks/jotai/base';
import { removeDir, removeFile } from '../../../../../tauri/tauri-files';
import { contentInstallationStatusAtoms } from '../../state/atoms';
import { ContentInstallationStatus } from '../../state/downloads/download-progress';

export const uninstallContent = async (ce: ContentElement) => {
  const gameFolder = getStore().get(GAME_FOLDER_ATOM);
  let removeResult;

  if (ce.definition.type === 'module') {
    const path = `${gameFolder}/ucp/modules/${ce.definition.name}-${ce.definition.version}.zip`;
    removeResult = await removeFile(path, false);
    removeResult = await removeFile(`${path}.sig`, true);
  } else {
    const path = `${gameFolder}/ucp/plugins/${ce.definition.name}-${ce.definition.version}`;
    removeResult = await removeDir(path, true);
  }

  return removeResult.isOk();
};

// eslint-disable-next-line import/prefer-default-export
export const uninstallContents = (contentElements: ContentElement[]) => {
  contentElements.forEach(async (ce) => {
    const id = `${ce.definition.name}@${ce.definition.version}`;

    const setStatus = (value: ContentInstallationStatus) => {
      getStore().set(contentInstallationStatusAtoms(id), value);
    };

    setStatus({
      action: 'uninstall',
      progress: 30,
      name: ce.definition.name,
      version: ce.definition.version,
    });

    try {
      const uninstallResult = await uninstallContent(ce);

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
