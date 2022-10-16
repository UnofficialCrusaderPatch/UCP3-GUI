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

  statusCallback(t('gui-download:zip.read'));
  const [zipData, zipDataError] = await readBinaryFile(zipFilePath);
  if (zipDataError) {
    return [false, t('gui-download:zip.read.error', { error: zipDataError })];
  }

  statusCallback(t('gui-download:zip.extract'));
  const zip = await JSZip.loadAsync(zipData as Uint8Array);
  const listOfDir: Array<JSZip.JSZipObject> = [];
  const listOfFiles: Array<JSZip.JSZipObject> = [];
  zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
    (file.dir ? listOfDir : listOfFiles).push(file);
  });
  // https://github.com/tauri-apps/tauri-docs/issues/696
  try {
    await Promise.all(
      listOfDir.map(async (dir) => {
        const [success, error] = await recursiveCreateDir(
          await resolvePath(gameFolder, dir.name)
        );
        if (!success) {
          throw error;
        }
      })
    );
    await Promise.all(
      listOfFiles.map(async (file) => {
        const fileData = await file.async('uint8array');
        const [success, error] = await writeBinaryFile(
          await resolvePath(gameFolder, file.name),
          fileData
        );
        if (!success) {
          throw error;
        }
      })
    );
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

export async function checkForUCP3Updates(gameFolder: string) {
  const [yamlRet] = await loadYaml(`${gameFolder}/ucp-version.yml`);
  const { sha } = yamlRet || { sha: '!' };
  const result = await checkForLatestUCP3DevReleaseUpdate(sha);

  if (result.update === true) {
    // ask options are fixed in tauri
    const dialogResult = await askInfo(
      `Do you want to download the latest UCP3 version?\n\n${result.file}`,
      'Confirm'
    );

    if (dialogResult !== true) {
      showInfo('cancelled by user');
      return {
        update: false,
        file: '',
        downloaded: false,
        installed: false,
      };
    }

    const downloadPath = `${await getLocalDataFolder()}/ucp-zip/${result.file}`;
    await recursiveCreateDir(downloadPath); // TODO: no safety
    const response = await fetchBinary<BinaryFileContents>(result.downloadUrl, {
      headers: {
        Authorization: `Basic ${window.btoa(
          `ucp3-machine:${UCP3_REPOS_MACHINE_TOKEN}`
        )}`,
      },
    });

    if (response.ok) {
      await writeBinaryFile(downloadPath, response.data);
    } else {
      showWarning('Failed to download UCP3 update.');
      return {
        update: false,
        file: '',
        downloaded: false,
        installed: false,
      };
    }

    console.log(downloadPath);
    const installResult = await installUCPFromZip(downloadPath, gameFolder);

    // TODO: in the future, use a cache?
    await removeFile(downloadPath);

    return {
      update: true,
      file: result.file,
      downloaded: downloadPath,
      installed: installResult,
    };
  }

  return {
    update: false,
    file: result.file,
    downloaded: false,
    installed: false,
  };
}
