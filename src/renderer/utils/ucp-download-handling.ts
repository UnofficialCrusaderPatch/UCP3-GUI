import {
  BinaryFileContents,
  copyFile,
  createDir,
  readTextFile,
  removeFile,
  writeBinaryFile,
} from '@tauri-apps/api/fs';
import JSZip from 'jszip';
import { resolve } from '@tauri-apps/api/path';
import {
  checkForLatestUCP3DevReleaseUpdate,
  UCP3_REPOS_MACHINE_TOKEN,
} from '../../main/versions/github';
import { fetchBinary, loadYaml, proxyFsExists } from './file-utils';
import { askInfo, showInfo, showWarning } from './dialog-util';

export async function installUCPFromZip(
  zipFilePath: string,
  gameFolder: string
) {
  if (!(await proxyFsExists(`${gameFolder}/binkw32_real.dll`))) {
    if (await proxyFsExists(`${gameFolder}/binkw32.dll`)) {
      await copyFile(
        `${gameFolder}/binkw32.dll`,
        `${gameFolder}/binkw32_real.dll`
      );
    } else {
      // TODO: appropriate warning
      window.alert(
        `binkw32.dll does not exist in this directory, are we in a game directory?`
      );
    }
  }

  const data = await readBinaryFile(zipFilePath);
  const zip = await JSZip.loadAsync(data);

  const listOfDir: Array<JSZip.JSZipObject> = [];
  const listOfFiles: Array<JSZip.JSZipObject> = [];
  zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
    (file.dir ? listOfDir : listOfFiles).push(file);
  });
  // https://github.com/tauri-apps/tauri-docs/issues/696
  await Promise.all(
    listOfDir.map((dir) =>
      createDir(`${gameFolder}/${dir.name}`, { recursive: true })
    )
  );
  await Promise.all(
    listOfFiles.map(async (file) => {
      const fileData = await file.async('uint8array');
      await writeBinaryFile(`${gameFolder}/${file.name}`, fileData);
    })
  );
  console.log(`Extracted ${listOfFiles.length} entries`);

  await copyFile(`${gameFolder}/binkw32_ucp.dll`, `${gameFolder}/binkw32.dll`);

  return true;
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

    const downloadPath = `${gameFolder}/${result.file}`;
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
    const installResult = await this.installUCPFromZip(
      downloadPath,
      gameFolder
    );

    // TODO: in the future, use a cache?
    await removeFile(downloadPath);

    return {
      update: true,
      file: result.file,
      downloaded: resolve(downloadPath),
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
