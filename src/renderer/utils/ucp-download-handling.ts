import JSZip from 'jszip';
import { BinaryFileContents } from '@tauri-apps/api/fs';
import { TFunction } from 'react-i18next';
import {
  checkForLatestUCP3DevReleaseUpdate,
  UCP3_REPOS_MACHINE_TOKEN,
} from '../../main/versions/github';
import {
  copyFile,
  fetchBinary,
  getLocalDataFolder,
  loadYaml,
  proxyFsExists,
  readBinaryFile,
  recursiveCreateDir,
  removeFile,
  writeBinaryFile,
  Error as FileUtilError,
  resolvePath,
} from './file-utils';
import { askInfo, showInfo, showWarning } from './dialog-util';
import { extractZipToPath } from './tauri-invoke';

export async function installUCPFromZip(
  zipFilePath: string,
  gameFolder: string,
  statusCallback: (status: string) => void,
  t: TFunction
): Promise<[boolean, FileUtilError]> {
  const binkRealPath = await resolvePath(gameFolder, 'binkw32_real.dll');
  const binkUcpPath = await resolvePath(gameFolder, 'binkw32_ucp.dll');
  const binkPath = await resolvePath(gameFolder, 'binkw32.dll');

  statusCallback(t('gui-download:bink.copy.real'));
  if (!(await proxyFsExists(binkRealPath))) {
    if (await proxyFsExists(binkPath)) {
      // TODO: could this also be a rename?
      const [success, error] = await copyFile(binkPath, binkRealPath);
      if (!success) {
        return [false, t('gui-download:bink.copy.real.error', { error })];
      }
    } else {
      return [false, t('gui-download:bink.missing')];
    }
  }

  statusCallback(t('gui-download:zip.extract'));
  try {
    await extractZipToPath(zipFilePath, gameFolder);
  } catch (error) {
    return [false, t('gui-download:zip.extract.error', { error })];
  }

  statusCallback(t('gui-download:bink.copy.ucp'));
  // TODO: could this also be a rename?
  const [success, error] = await copyFile(binkUcpPath, binkPath);
  if (!success) {
    return [false, t('gui-download:bink.copy.ucp.error', { error })];
  }
  return [true, undefined];
}

export async function checkForUCP3Updates(
  gameFolder: string,
  statusCallback: (status: string) => void,
  t: TFunction
) {
  const returnObject = {
    update: false,
    file: '',
    downloaded: false,
    installed: false,
  };

  statusCallback(t('gui-download:ucp.version.yaml.load'));
  const [yamlRet] = await loadYaml(
    await resolvePath(gameFolder, 'ucp-version.yml')
  );
  const { sha } = yamlRet || { sha: '!' };

  statusCallback(t('gui-download:ucp.version.check'));
  const result = await checkForLatestUCP3DevReleaseUpdate(sha);

  if (result.update !== true) {
    statusCallback(t('gui-download:ucp.version.not.available'));
    return returnObject;
  }
  returnObject.update = true;
  returnObject.file = result.file;

  // ask options are fixed in tauri
  const dialogResult = await askInfo(
    t('gui-download:ucp.download.request', { version: result.file }),
    t('gui-general:confirm')
  );

  if (dialogResult !== true) {
    statusCallback(t('gui-download:ucp.download.cancelled'));
    return returnObject;
  }

  statusCallback(t('gui-download:ucp.download.download'));
  const downloadPath = `${await getLocalDataFolder()}/ucp-zip/${result.file}`;
  try {
    let [success, error] = await recursiveCreateDir(downloadPath);
    if (!success) {
      throw error;
    }

    const response = await fetchBinary<BinaryFileContents>(result.downloadUrl, {
      headers: {
        Authorization: `Basic ${window.btoa(
          `ucp3-machine:${UCP3_REPOS_MACHINE_TOKEN}`
        )}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch update.');
    }

    [success, error] = await writeBinaryFile(downloadPath, response.data);
    if (!success) {
      throw error;
    }
  } catch (error) {
    statusCallback(t('gui-download:ucp.download.failed', { error }));
    return returnObject;
  }
  returnObject.downloaded = true;

  // has its own statusCallbacks
  const [installResult, installError] = await installUCPFromZip(
    downloadPath,
    gameFolder,
    statusCallback,
    t
  );
  if (!installResult) {
    statusCallback(
      t('gui-download:ucp.install.failed', { error: installError })
    );
    return returnObject;
  }

  // TODO: in the future, use a cache?
  const [removeResult, removeError] = await removeFile(downloadPath);
  if (!removeResult) {
    showWarning(
      t('gui-download:ucp.install.zip.remove.failed', { error: removeError })
    );
  }

  returnObject.installed = true;
  return returnObject;
}
