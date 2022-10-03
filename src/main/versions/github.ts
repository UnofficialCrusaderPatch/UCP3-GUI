import axios from 'axios';

const UCP3_REPO_URL = 'UnofficialCrusaderPatch/UnofficialCrusaderPatch3';
const UCP3_REPO_URL_API = `https://api.github.com/repos/${UCP3_REPO_URL}`;
const UCP3_REPOS_MACHINE_TOKEN = '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';

async function checkForLatestUCP3DevReleaseUpdate(currentSHA: string):
    Promise<{ update: boolean, file: string, downloadUrl: string }> {
  const result = {
    update: false,
    file: "",
    downloadUrl: "",
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
          (asset) => asset.name.indexOf('DevRelease') !== -1
        )[0];

        const detectedSha = devReleaseAsset.browser_download_url
          .split('UCP3-snapshot-DevRelease-')[1]
          .split('.zip')[0];
        
        if (!currentSHA.startsWith(detectedSha)) {
          result.update = true;
          result.file = devReleaseAsset.name,
          result.downloadUrl = devReleaseAsset.url
        };
      }
    )
    .catch((error: Error) => {
      console.error(error);
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
