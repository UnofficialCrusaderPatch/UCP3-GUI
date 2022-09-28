import axios from 'axios';
import fs from 'fs';
import { download } from 'electron-dl';
import { BrowserWindow } from 'electron';

const UCP3_REPO_URL = 'UnofficialCrusaderPatch/UnofficialCrusaderPatch3';
const UCP3_REPO_URL_API = `https://api.github.com/repos/${UCP3_REPO_URL}`;
const UCP3_REPOS_MACHINE_TOKEN = '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';

async function checkForLatestUCP3DevReleaseUpdate(currentSHA: string) {
  const result = await axios
    .get(`${UCP3_REPO_URL_API}/releases/tags/latest`, {
      auth: { username: 'ucp3-machine', password: UCP3_REPOS_MACHINE_TOKEN },
    })
    .then(
      (res: {
        data: {
          assets: {
            browser_download_url: any;
            name: string;
            url: string;
          }[];
        };
      }) => {
        const devReleaseAsset = res.data.assets.filter(
          (asset) => asset.name.indexOf('DevRelease') !== -1
        )[0];

        const detectedSha = devReleaseAsset.browser_download_url
          .split('UCP3-snapshot-DevRelease-')[1]
          .split('.zip')[0];

        if (currentSHA.startsWith(detectedSha)) {
          return { update: false };
        }

        return {
          update: true,
          file: devReleaseAsset.name,
          downloadUrl: devReleaseAsset.url,
        };
      }
    )
    .catch((error: Error) => {
      console.error(error);
      window.alert(error);
    });
  return result;
}

async function downloadDevReleaseUpdate(
  window: BrowserWindow,
  update: { file: string; downloadUrl: string },
  folder: string,
  onComplete: (info: { filename: string; path: string }) => void
) {
  download(window, update.downloadUrl, {
    directory: folder,
    filename: update.file,
    onCompleted: onComplete,
  });
}

async function getLatestUCP3Artifacts() {
  const result = await axios
    .get(`${UCP3_REPO_URL_API}/actions/artifacts`, {
      auth: { username: 'ucp3-machine', password: UCP3_REPOS_MACHINE_TOKEN },
    })
    .then((res: { data: { artifacts: unknown } }) => {
      console.log(res);
      return res.data.artifacts;
    })
    .catch((error: Error) => {
      console.error(error);
    });
  return result;
}

// eslint-disable-next-line import/prefer-default-export
export { checkForLatestUCP3DevReleaseUpdate, UCP3_REPOS_MACHINE_TOKEN };
