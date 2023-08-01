/* eslint-disable @typescript-eslint/no-throw-literal */
import { BinaryFileContents } from '@tauri-apps/api/fs';
import { ResponseType } from '@tauri-apps/api/http';
import { TFunction } from 'i18next';
import semver from 'semver';
import { askInfo } from 'tauri/tauri-dialog';
import {
  getDownloadFolder,
  joinPaths,
  writeBinaryFile,
} from 'tauri/tauri-files';
import { getBinary, getJSON, getSimple } from 'tauri/tauri-http';
import { getAppVersion } from 'tauri/tauri-misc';
import {
  GITHUB_AUTH_HEADER,
  GITHUB_BASIC_AUTH,
  UCP_GUI_REPO_URL,
} from './download-enums';

interface LatestGuiAssetInfo {
  assets: {
    browser_download_url: string;
    name: string;
    url: string;
    id: string;
    content_type: string;
  }[];
}

interface LatestGuiVersionInfo {
  version: string;
  pub_date: string;
  notes: string;
  platforms: {
    'windows-x86_64': {
      url: string;
      signature: string;
    };
  };
}

async function checkIfVersionNewer(latestVersion: string): Promise<boolean> {
  // if there are issues, an update might be fine
  const curVer = (await getAppVersion()).getOrElse('0.0.0');
  return semver.lt(curVer, latestVersion);
}

// eslint-disable-next-line import/prefer-default-export
export async function checkForGUIUpdates(
  setGuiUpdateStatus: (newText: string) => void,
  t: TFunction
) {
  setGuiUpdateStatus(t('gui-download:gui.github.contact'));
  const assetResponse = await getJSON<LatestGuiAssetInfo>(
    UCP_GUI_REPO_URL,
    GITHUB_AUTH_HEADER
  );
  if (!assetResponse.ok) {
    throw setGuiUpdateStatus(t('gui-download:gui.github.failed'));
  }
  const assetInfo = assetResponse.data;

  const latestJSONAsset = assetInfo.assets.filter(
    (asset) => asset.name === 'latest.json'
  )[0];

  setGuiUpdateStatus(t('gui-download:gui.fetching.version'));
  const versionResponse = await getSimple<LatestGuiVersionInfo>(
    latestJSONAsset.url,
    ResponseType.JSON,
    latestJSONAsset.content_type,
    GITHUB_BASIC_AUTH
  );
  if (!versionResponse.ok) {
    throw setGuiUpdateStatus(t('gui-download:gui.failed.version'));
  }
  const versionInfo = versionResponse.data;

  if (!(await checkIfVersionNewer(versionInfo.version))) {
    throw setGuiUpdateStatus(t('gui-download:gui.up.to.date'));
  }

  const dialogResult = await askInfo(
    t('gui-download:gui.download.ask', {
      version: versionInfo.version,
    }),
    t('gui-general:confirm')
  );

  if (dialogResult !== true) {
    throw setGuiUpdateStatus(t('gui-download:gui.download.not'));
  }

  const downloadPath = await joinPaths(
    await getDownloadFolder(),
    'UCP3-GUI', // workaround for limitation regarding the special folders
    `UCP3-GUI-${versionInfo.version}.exe`
  );
  const guiExeAsset = assetInfo.assets.filter(
    (asset) => asset.name === 'UCP3-GUI.exe'
  )[0];

  setGuiUpdateStatus(t('gui-download:gui.download.progress'));
  const binaryResponse = await getBinary<BinaryFileContents>(
    guiExeAsset.url,
    GITHUB_AUTH_HEADER
  );

  if (!binaryResponse.ok) {
    throw setGuiUpdateStatus(t('gui-download:gui.download.failed'));
  }
  setGuiUpdateStatus(t('gui-download:gui.download.write'));

  (await writeBinaryFile(downloadPath, binaryResponse.data)).throwIfErr();

  return t('gui-download:gui.download.done', {
    path: downloadPath,
  });
}
