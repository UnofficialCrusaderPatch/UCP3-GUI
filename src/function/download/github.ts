import axios from 'axios';
import { info, error as logError } from 'util/scripts/logging';
import { UCP3_REPOS_MACHINE_TOKEN, UCP3_REPO_URL_API } from './download-enums';

async function checkForLatestUCP3DevReleaseUpdate(
  currentSHA: string,
): Promise<{ update: boolean; file: string; downloadUrl: string }> {
  const result = {
    update: false,
    file: '',
    downloadUrl: '',
  };
  await axios
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
          (asset) => asset.name.indexOf('DevRelease') !== -1,
        )[0];

        const detectedSha = devReleaseAsset.browser_download_url
          .split('UCP3-snapshot-DevRelease-')[1]
          .split('.zip')[0];

        if (!currentSHA.startsWith(detectedSha)) {
          result.update = true;
          result.file = devReleaseAsset.name;
          result.downloadUrl = devReleaseAsset.url;
        }

        return result;
      },
    )
    .catch((error: Error) => {
      logError(error);
      window.alert(error);
    });

  // TODO: there should be a proper "no/failed connection"-handling

  return result;
}

async function getLatestUCP3Artifacts() {
  const result = await axios
    .get(`${UCP3_REPO_URL_API}/actions/artifacts`, {
      auth: { username: 'ucp3-machine', password: UCP3_REPOS_MACHINE_TOKEN },
    })
    .then((res: { data: { artifacts: unknown } }) => {
      info(res);
      return res.data.artifacts;
    })
    .catch((error: Error) => {
      logError(error);
    });
  return result;
}

// eslint-disable-next-line import/prefer-default-export
export { checkForLatestUCP3DevReleaseUpdate, UCP3_REPOS_MACHINE_TOKEN };
