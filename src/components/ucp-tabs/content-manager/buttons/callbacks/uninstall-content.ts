import { ContentElement } from '../../../../../function/content/types/content-element';
import { GAME_FOLDER_ATOM } from '../../../../../function/game-folder/game-folder-atom';
import { createExtensionID } from '../../../../../function/global/constants/extension-id';
import {
  UCP_MODULES_FOLDER,
  UCP_PLUGINS_FOLDER,
} from '../../../../../function/global/constants/file-constants';
import { getStore } from '../../../../../hooks/jotai/base';
import { removeDir, removeFile } from '../../../../../tauri/tauri-files';
import Logger from '../../../../../util/scripts/logging';
import {
  CONTENT_TAB_LOCK,
  contentInstallationStatusAtoms,
} from '../../state/atoms';
import { ContentInstallationStatus } from '../../state/downloads/download-progress';

const LOGGER = new Logger('uninstall-content.ts');

export const uninstallContent = async (ce: ContentElement) => {
  const gameFolder = getStore().get(GAME_FOLDER_ATOM);

  if (ce.definition.type === 'module') {
    const path = `${gameFolder}/${UCP_MODULES_FOLDER}${ce.definition.name}-${ce.definition.version}.zip`;
    const result = await removeFile(path, false);
    const result2 = await removeFile(`${path}.sig`, true);

    if (result.isErr()) {
      LOGGER.msg(`${result.err().get()}`);
    }

    if (result2.isErr()) {
      LOGGER.msg(`${result.err().get()}`);
    }

    return result.isOk() && result2.isOk();
  }

  const path = `${gameFolder}/${UCP_PLUGINS_FOLDER}${ce.definition.name}-${ce.definition.version}`;
  const result = await removeDir(path, true);
  if (result.isErr()) {
    LOGGER.msg(`${result.err().get()}`);
  }

  return result.isOk();
};

// eslint-disable-next-line import/prefer-default-export
export const uninstallContents = (contentElements: ContentElement[]) =>
  Promise.all(
    contentElements.map(async (ce) => {
      const id = createExtensionID(ce);

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

      getStore().set(CONTENT_TAB_LOCK, getStore().get(CONTENT_TAB_LOCK) - 1);
    }),
  );
