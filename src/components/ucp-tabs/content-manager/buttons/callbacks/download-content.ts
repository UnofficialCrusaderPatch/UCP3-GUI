import { createDir } from '@tauri-apps/api/fs';
import { ContentElement } from '../../../../../function/content/types/content-element';
import { GAME_FOLDER_ATOM } from '../../../../../function/game-folder/game-folder-atom';
import { getStore } from '../../../../../hooks/jotai/base';
import { download } from '../../../../../tauri/tauri-http';
import Logger from '../../../../../util/scripts/logging';
import { showModalOk } from '../../../../modals/modal-ok';
import { DOWNLOAD_PROGRESS_ATOM } from '../../state/downloads/download-progress';
import { installPlugin } from '../../../../../function/extensions/installation/install-module';
import { onFsExists, removeFile } from '../../../../../tauri/tauri-files';

const LOGGER = new Logger('download-button.tsx');

const guessTotalSize = (currentSize: number) => {
  const steps = [
    1000 * 100,
    1000 * 200,
    1000 * 500,
    1000 * 1000 * 1,
    1000 * 1000 * 2,
    1000 * 1000 * 5,
    1000 * 1000 * 10,
    1000 * 1000 * 20,
    1000 * 1000 * 30,
    1000 * 1000 * 40,
    1000 * 1000 * 50,
    1000 * 1000 * 100,
    1000 * 1000 * 200,
    1000 * 1000 * 300,
    1000 * 1000 * 400,
    1000 * 1000 * 500,
    1000 * 1000 * 600,
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

export const downloadPlugin = async (contentElement: ContentElement) => {
  const zipSources = contentElement.sources.package.filter(
    (pc) => pc.method === 'github-zip',
  );

  if (zipSources.length === 0) {
    throw new Error(`No zip sources`);
  }

  const src = zipSources.at(0)!;

  const contentDownloadProgressDB = getStore().get(DOWNLOAD_PROGRESS_ATOM);

  const id = `${contentElement.definition.name}@${contentElement.definition.version}`;

  const gameFolder = getStore().get(GAME_FOLDER_ATOM);

  const cacheDir = `${gameFolder}/ucp/.cache/`;
  if (!(await onFsExists(cacheDir))) {
    LOGGER.msg(`.cache directory doesn't exist, creating it!`);
    await createDir(cacheDir);
  }

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
      currentPercent: string,
    ) => {
      let percentage = parseFloat(currentPercent.replaceAll('%', ''));
      if (Number.isNaN(percentage)) {
        if (src.size && src.size > 0) {
          percentage = 100 * (currentSize / src.size);
        } else {
          // eslint-disable-next-line no-param-reassign
          totalSize = guessTotalSize(currentSize);
          percentage = 100 * (currentSize / totalSize);
        }
      }

      contentDownloadProgressDB[id] = {
        progress: Math.floor(percentage),
        name: contentElement.definition.name,
        version: contentElement.definition.version,
        error: false,
        pending: true,
      };
      getStore().set(DOWNLOAD_PROGRESS_ATOM, { ...contentDownloadProgressDB });
    },
  );

  contentDownloadProgressDB[id] = {
    progress: 100,
    name: contentElement.definition.name,
    version: contentElement.definition.version,
    error: false,
    pending: false,
  };
  getStore().set(DOWNLOAD_PROGRESS_ATOM, { ...contentDownloadProgressDB });

  LOGGER.msg(
    `Installing ${contentElement.definition.name} from ${destination} into ${gameFolder}/ucp/plugins`,
  ).debug();

  await installPlugin(gameFolder, destination, {
    zapRootFolder: true,
  });

  LOGGER.msg(`Removing ${destination}`).debug();
  await removeFile(destination);
};

// eslint-disable-next-line import/prefer-default-export
export const downloadContent = async (contentElements: ContentElement[]) => {
  LOGGER.msg(
    `Downloading: ${contentElements.map((ce) => ce.definition.name).join(', ')}`,
  ).debug();

  const contentElementsWithoutPackageSource = contentElements.filter(
    (ce) => ce.sources.package.length === 0,
  );

  if (contentElementsWithoutPackageSource.length > 0) {
    await showModalOk({
      title: 'Failed to install content',
      message: `Some content doesn't have a download source: ${contentElementsWithoutPackageSource.map((ce) => ce.definition.name).join(', ')}`,
    });

    return;
  }

  const modules = contentElements.filter(
    (ce) => ce.definition.type === 'module',
  );

  if (modules.length > 0) {
    await showModalOk({
      title: 'Failed to install content',
      message: `Some content are modules, installing modules is not implemented yet: ${modules.map((ce) => ce.definition.name).join(', ')}`,
    });

    return;
  }

  const plugins = contentElements.filter(
    (ce) => ce.definition.type === 'plugin',
  );

  if (plugins.length === 0) {
    await showModalOk({
      title: 'Failed to install content',
      message: `No content to install`,
    });

    return;
  }

  plugins.forEach((plugin) => downloadPlugin(plugin));
};
