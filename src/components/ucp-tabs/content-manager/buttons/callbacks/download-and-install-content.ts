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
import { CONTENT_TAB_LOCK } from '../../state/atoms';
import { getHexHashOfFile } from '../../../../../util/scripts/hash';
import { BinaryModulePackageContent } from '../../../../../function/content/store/fetch';
import { UCP_CACHE_FOLDER } from '../../../../../function/global/constants/file-constants';
import { createStatusSetter } from './status';

const LOGGER = new Logger('download-button.tsx');

const guessTotalSize = (currentSize: number) => {
  const steps = [
    1000 * 500,

    1000 * 1000 * 10,

    1000 * 1000 * 100,

    1000 * 1000 * 500,

    1000 * 1000 * 1000,
  ];

  // eslint-disable-next-line no-restricted-syntax
  for (const step of steps) {
    if (currentSize < step) {
      return step;
    }
  }

  return steps.at(-1)!;
};

export const downloadAndInstallContent = async (
  contentElement: ContentElement,
) => {
  const setStatus = createStatusSetter(contentElement);

  const zipSources = contentElement.contents.package.filter(
    (pc) => pc.method === 'github-binary',
  );

  if (zipSources.length === 0) {
    setStatus({
      action: 'error',
      /* todo:locale: */
      message: `No package found for this content that supports the methods: github-binary`,
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return;
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
          // eslint-disable-next-line no-param-reassign
          totalSize = guessTotalSize(currentSize);
          percentage = 100 * (currentSize / totalSize);
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
    setStatus({
      action: 'error',
      /* todo:locale: */
      message: 'hashes not equal, download was corrupted',
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return;
  }

  LOGGER.msg(
    `Installing ${contentElement.definition.name} from ${destination} into ${gameFolder}/ucp/ extension subfolder`,
  ).debug();

  setStatus({
    action: 'install',
    progress: 30, // Start at 10%
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
    setStatus({
      action: 'error',
      /* todo:locale: */
      message: e.toString(),
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return;
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
    setStatus({
      action: 'error',
      /* todo:locale: */
      message: JSON.stringify(removeResult.err().get()),
      name: contentElement.definition.name,
      version: contentElement.definition.version,
    });
    return;
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
};

// eslint-disable-next-line import/prefer-default-export
export const downloadContent = async (contentElements: ContentElement[]) => {
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

    return;
  }

  await Promise.all(
    contentElements.map(async (ce) => {
      const setStatus = createStatusSetter(ce);
      setStatus({
        action: 'download',
        progress: 0,
        name: ce.definition.name,
        version: ce.definition.version,
      });

      try {
        await downloadAndInstallContent(ce);
      } catch (e: any) {
        setStatus({
          action: 'error',
          /* todo:locale: */
          message: e.toString(),
          name: ce.definition.name,
          version: ce.definition.version,
        });
      }

      getStore().set(CONTENT_TAB_LOCK, getStore().get(CONTENT_TAB_LOCK) - 1);
    }),
  );
};
