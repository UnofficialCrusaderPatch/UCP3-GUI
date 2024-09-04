import { createDir } from '@tauri-apps/api/fs';
import { ContentElement } from '../../../../../function/content/types/content-element';
import { GAME_FOLDER_ATOM } from '../../../../../function/game-folder/game-folder-atom';
import { getStore } from '../../../../../hooks/jotai/base';
import { download } from '../../../../../tauri/tauri-http';
import Logger from '../../../../../util/scripts/logging';
import { showModalOk } from '../../../../modals/modal-ok';
import {
  installModule,
  installPlugin,
} from '../../../../../function/extensions/installation/install-module';
import { onFsExists, removeFile } from '../../../../../tauri/tauri-files';
import { getHexHashOfFile } from '../../../../../util/scripts/hash';
import { BinaryModulePackageContent } from '../../../../../function/content/store/fetch';
import { UCP_CACHE_FOLDER } from '../../../../../function/global/constants/file-constants';
import { createStatusSetter } from './status';
import {
  ErrorContentMutationResult,
  OkayContentMutationResult,
  DownloadAndInstallContentResult,
} from '../../types/content-store-mutation-result';

const LOGGER = new Logger('download-button.tsx');

export async function downloadAndInstallContent(
  contentElement: ContentElement,
) {
  const setStatus = createStatusSetter(contentElement);

  const zipSources = contentElement.contents.package.filter(
    (pc) => pc.method === 'github-binary',
  );

  if (zipSources.length === 0) {
    /* todo:locale: */
    const msg = `No package found for this content that supports the methods: github-binary`;
    setStatus({
      action: 'error',
      message: msg,
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return {
      contentElement,
      status: 'error',
      message: msg,
      type: 'download_and_install',
    } as ErrorContentMutationResult;
  }

  const src = zipSources.at(0)!;

  const gameFolder = getStore().get(GAME_FOLDER_ATOM);

  const cacheDir = `${gameFolder}/${UCP_CACHE_FOLDER}`;

  const destination = `${cacheDir}${contentElement.definition.name}-${contentElement.definition.version}.zip`;

  LOGGER.msg(
    `Downloading ${contentElement.definition.name} from ${src.url} to ${destination}`,
  ).debug();

  await download(
    src.url,
    destination,
    (
      chunkSize: number,
      currentSize: number,
      totalSize: number,
      currentPercent: number,
    ) => {
      let percentage = currentPercent;
      if (Number.isNaN(percentage)) {
        if (src.size && src.size > 0) {
          percentage = 100 * (currentSize / src.size);
        } else {
          // If we don't know the binary size, display no progress
          percentage = 0;
        }
      }

      setStatus({
        action: 'download',
        progress: Math.floor(percentage),
        name: contentElement.definition.name,
        version: contentElement.definition.version,
      });
    },
  );

  setStatus({
    action: 'download',
    progress: 100,
    name: contentElement.definition.name,
    version: contentElement.definition.version,
  });

  LOGGER.msg(`Verifying hash`).debug();

  const hash = await getHexHashOfFile(destination);
  if (hash.toLowerCase() !== src.hash.toLowerCase()) {
    /* todo:locale: */
    const msg = 'hashes not equal, download was corrupted';
    setStatus({
      action: 'error',
      message: msg,
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return {
      contentElement,
      status: 'error',
      message: msg,
      type: 'download_and_install',
    } as ErrorContentMutationResult;
  }

  LOGGER.msg(
    `Installing ${contentElement.definition.name} from ${destination} into ${gameFolder}/ucp/ extension subfolder`,
  ).debug();

  setStatus({
    action: 'install',
    progress: 30,
    name: contentElement.definition.name,
    version: contentElement.definition.version,
  });

  try {
    if (contentElement.definition.type === 'module') {
      await installModule(
        gameFolder,
        destination,
        (src as BinaryModulePackageContent).signature,
      );
    } else {
      await installPlugin(gameFolder, destination, {
        zapRootFolder: src.method === 'github-zip',
      });
    }
  } catch (e: any) {
    /* todo:locale: */
    const msg = e.toString();
    setStatus({
      action: 'error',
      message: msg,
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return {
      contentElement,
      status: 'error',
      message: msg,
      type: 'download_and_install',
    } as ErrorContentMutationResult;
  }

  setStatus({
    action: 'install',
    progress: 60,
    name: contentElement.definition.name,
    version: contentElement.definition.version,
  });

  LOGGER.msg(`Removing ${destination}`).debug();
  const removeResult = await removeFile(destination);

  if (removeResult.isErr()) {
    /* todo:locale: */
    const msg = JSON.stringify(removeResult.err().get());
    setStatus({
      action: 'error',
      message: msg,
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return {
      contentElement,
      status: 'error',
      message: msg,
      type: 'download_and_install',
    } as ErrorContentMutationResult;
  }

  setStatus({
    action: 'install',
    progress: 100,
    name: contentElement.definition.name,
    version: contentElement.definition.version,
  });

  // eslint-disable-next-line no-param-reassign
  contentElement.installed = true;

  setStatus({
    action: 'idle',
    name: contentElement.definition.name,
    version: contentElement.definition.version,
  });

  return {
    contentElement,
    status: 'ok',
    type: 'download_and_install',
  } as OkayContentMutationResult;
}

// eslint-disable-next-line import/prefer-default-export
export async function installOnlineContent(
  contentElements: ContentElement[],
  onSettled?: (result: DownloadAndInstallContentResult) => void,
) {
  LOGGER.msg(
    `Downloading: ${contentElements.map((ce) => ce.definition.name).join(', ')}`,
  ).debug();

  const gameFolder = getStore().get(GAME_FOLDER_ATOM);

  const cacheDir = `${gameFolder}/${UCP_CACHE_FOLDER}`;
  if (!(await onFsExists(cacheDir))) {
    LOGGER.msg(`.cache directory doesn't exist, creating it!`).warn();
    await createDir(cacheDir);
  }

  const contentElementsWithoutPackageSource = contentElements.filter(
    (ce) => ce.contents.package.length === 0,
  );

  if (contentElementsWithoutPackageSource.length > 0) {
    /* todo:locale: */
    await showModalOk({
      title: 'Failed to install content',
      message: `Some content doesn't have a download source: ${contentElementsWithoutPackageSource.map((ce) => ce.definition.name).join(', ')}`,
    });

    return contentElementsWithoutPackageSource.map((ce) => {
      /* todo:locale: */
      const msg = `Some content doesn't have a download source: ${ce.definition.name}`;

      // We don't use onSettled here because we never even started any installing or downloading
      return {
        contentElement: ce,
        status: 'error',
        message: msg,
        type: 'download_and_install',
      } as ErrorContentMutationResult;
    });
  }

  return Promise.all(
    contentElements.map(async (ce) => {
      const setStatus = createStatusSetter(ce);
      setStatus({
        action: 'download',
        progress: 0,
        name: ce.definition.name,
        version: ce.definition.version,
      });

      try {
        const result = await downloadAndInstallContent(ce);
        if (onSettled) onSettled(result);
        return result;
      } catch (e: any) {
        /* todo:locale: */
        const msg = e.toString();
        setStatus({
          action: 'error',
          message: msg,
          name: ce.definition.name,
          version: ce.definition.version,
        });
        const result = {
          contentElement: ce,
          status: 'error',
          message: msg,
          type: 'download_and_install',
        } as ErrorContentMutationResult;
        if (onSettled) onSettled(result);

        return result;
      }
    }),
  );
}
