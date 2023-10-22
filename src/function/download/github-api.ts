import axios from 'axios';

type GitReleaseAttachment = {
  url: string;
  fileName: string;
  downloadUrl: string;
};

type GitRelease = {
  name: string;
  tag: string;
  url: string;
  date: string;
  attachments: GitReleaseAttachment[];
};

async function getLatestUCP3Release() {
  const url =
    'https://api.github.com/repos/UnofficialCrusaderPatch/UnofficialCrusaderPatch3/releases';

  const resultRaw = await axios.get(url);
  const resultJSON = JSON.parse(resultRaw as any);

  const relevantReleases = resultJSON.filter((rel: any) => rel.draft === false);

  if (relevantReleases.length === 0) {
    throw new Error('no releases found');
  }

  const latestRelease = relevantReleases[0];

  return {
    name: latestRelease.name,
    tag: latestRelease.tag_name,
    url: latestRelease.url,
    date: latestRelease.created_at,
    attachments: latestRelease.assets.map(
      (asset: any) =>
        ({
          fileName: asset.name,
          url: asset.url,
          downloadUrl: asset.browser_download_url,
        }) as GitReleaseAttachment,
    ),
  } as GitRelease;
}

async function downloadAttachment(a: GitReleaseAttachment) {
  const result: any = await axios.get(a.downloadUrl);

  const blob = result.blob();

  return blob;
}
