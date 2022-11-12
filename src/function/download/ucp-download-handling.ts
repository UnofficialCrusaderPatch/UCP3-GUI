import { BinaryFileContents } from '@tauri-apps/api/fs';
import { TFunction } from 'react-i18next';
import {
  checkForLatestUCP3DevReleaseUpdate,
  UCP3_REPOS_MACHINE_TOKEN,
} from '../../code/main/versions/github';
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
} from '../../tauri/tauri-files';
import { askInfo, showInfo, showWarning } from '../../tauri/tauri-dialog';
import { extractZipToPath } from './tauri-invoke';
import Result from './result';
import Option from '../../util/structs/option';

export async function installUCPFromZip(
  zipFilePath: string,
  gameFolder: string,
  statusCallback: (status: string) => void,
  t: TFunction
): Promise<Result<void, FileUtilError>> {
  return Result.tryAsync(async () => {
    const binkRealPath = await resolvePath(gameFolder, 'binkw32_real.dll');
    const binkUcpPath = await resolvePath(gameFolder, 'binkw32_ucp.dll');
    const binkPath = await resolvePath(gameFolder, 'binkw32.dll');

    statusCallback(t('gui-download:bink.copy.real'));
    if (!(await proxyFsExists(binkRealPath))) {
      if (await proxyFsExists(binkPath)) {
        // TODO: could this also be a rename?
        (await copyFile(binkPath, binkRealPath))
          .mapErr((error) => t('gui-download:bink.copy.real.error', { error }))
          .throwIfErr();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw t('gui-download:bink.missing');
      }
    }

    statusCallback(t('gui-download:zip.extract'));
    try {
      await extractZipToPath(zipFilePath, gameFolder);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw t('gui-download:zip.extract.error', { error });
    }

    statusCallback(t('gui-download:bink.copy.ucp'));
    // TODO: could this also be a rename?
    (await copyFile(binkUcpPath, binkPath))
      .mapErr((error) => t('gui-download:bink.copy.real.error', { error }))
      .throwIfErr();
  });
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
  const sha = (await loadYaml(await resolvePath(gameFolder, 'ucp-version.yml')))
    .ok()
    .map((content) => content.sha as string | undefined)
    .notUndefinedOrNull()
    .getOrElse('!');

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
    (await recursiveCreateDir(downloadPath)).throwIfErr();

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

    (await writeBinaryFile(downloadPath, response.data)).throwIfErr();
  } catch (error) {
    statusCallback(t('gui-download:ucp.download.failed', { error }));
    return returnObject;
  }
  returnObject.downloaded = true;

  // has its own statusCallbacks
  const installResult = await installUCPFromZip(
    downloadPath,
    gameFolder,
    statusCallback,
    t
  );
  if (installResult.isErr()) {
    installResult
      .err()
      .ifPresent((error) =>
        statusCallback(t('gui-download:ucp.install.failed', { error }))
      );
    return returnObject;
  }

  // TODO: in the future, use a cache?
  (await removeFile(downloadPath))
    .err()
    .ifPresent((error) =>
      showWarning(t('gui-download:ucp.install.zip.remove.failed', { error }))
    );

  returnObject.installed = true;
  return returnObject;
}
