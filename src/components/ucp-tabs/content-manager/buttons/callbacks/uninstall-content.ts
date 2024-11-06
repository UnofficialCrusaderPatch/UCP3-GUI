import { ContentElement } from '../../../../../function/content/types/content-element';
import { GAME_FOLDER_ATOM } from '../../../../../function/game-folder/game-folder-interface';
import {
  UCP_MODULES_FOLDER,
  UCP_PLUGINS_FOLDER,
} from '../../../../../function/global/constants/file-constants';
import { getStore } from '../../../../../hooks/jotai/base';
import { removeDir, removeFile } from '../../../../../tauri/tauri-files';
import Logger from '../../../../../util/scripts/logging';
import {
  ErrorContentMutationResult,
  OkayContentMutationResult,
} from '../../types/content-store-mutation-result';
import { createStatusSetter } from './status';

const LOGGER = new Logger('uninstall-content.ts');

export async function uninstallContent(ce: ContentElement) {
  const gameFolder = getStore().get(GAME_FOLDER_ATOM).valueOf();

  if (ce.definition.type === 'module') {
    const path = `${gameFolder}/${UCP_MODULES_FOLDER}${ce.definition.name}-${ce.definition.version}.zip`;
    const result = await removeFile(path, false);
    const result2 = await removeFile(`${path}.sig`, true);

    let err: string = '';

    if (result.isErr()) {
      err = `${result.err().get()}`;
      LOGGER.msg(err);
    }

    if (result2.isErr()) {
      err = `${result2.err().get()}`;
      LOGGER.msg(err);
    }

    if (result.isOk() && result2.isOk()) {
      return {
        contentElement: ce,
        status: 'ok',
        type: 'uninstall',
      } as OkayContentMutationResult;
    }
    return {
      contentElement: ce,
      status: 'error',
      message: err,
      type: 'uninstall',
    } as ErrorContentMutationResult;
  }

  const path = `${gameFolder}/${UCP_PLUGINS_FOLDER}${ce.definition.name}-${ce.definition.version}`;
  const result = await removeDir(path, true);
  if (result.isErr()) {
    const err = `${result.err().get()}`;
    LOGGER.msg(err);
    return {
      contentElement: ce,
      status: 'error',
      message: err,
      type: 'uninstall',
    } as ErrorContentMutationResult;
  }

  return {
    contentElement: ce,
    status: 'ok',
    type: 'uninstall',
  } as OkayContentMutationResult;
}

// eslint-disable-next-line import/prefer-default-export
export function uninstallContents(
  contentElements: ContentElement[],
  onSettled?: (result?: unknown) => void,
) {
  return Promise.all(
    contentElements.map(async (ce) => {
      const setStatus = createStatusSetter(ce);

      setStatus({
        action: 'uninstall',
        progress: 30,
        name: ce.definition.name,
        version: ce.definition.version,
      });

      try {
        const uninstallResult = await uninstallContent(ce);

        if (uninstallResult.status !== 'ok') {
          setStatus({
            action: 'error',
            /* todo:locale: */
            message: uninstallResult.message,
            name: ce.definition.name,
            version: ce.definition.version,
          });
          return {
            contentElement: ce,
            status: 'error',
            message: uninstallResult.message,
            type: 'uninstall',
          } as ErrorContentMutationResult;
        }
      } catch (e: unknown) {
        const err = `${e}`;
        setStatus({
          action: 'error',
          /* todo:locale: */
          message: err,
          name: ce.definition.name,
          version: ce.definition.version,
        });
        return {
          contentElement: ce,
          status: 'error',
          message: err,
          type: 'uninstall',
        } as ErrorContentMutationResult;
      } finally {
        if (onSettled) onSettled();
      }

      // eslint-disable-next-line no-param-reassign
      ce.installed = false;

      setStatus({
        action: 'idle',
        name: ce.definition.name,
        version: ce.definition.version,
      });

      return {
        contentElement: ce,
        status: 'ok',
        type: 'uninstall',
      } as OkayContentMutationResult;
    }),
  );
}
