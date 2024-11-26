import { Octokit } from '@octokit/rest';
import { writeFileSync } from 'fs';

const github = new Octokit({});

const release = await github.rest.repos.getReleaseByTag({
  owner: 'UnofficialCrusaderPatch',
  repo: 'UCP3-GUI',
  tag: 'v${{ env.UCP3-GUI_VERSION }}',
});

const assets = await github.rest.repos.listReleaseAssets({
  owner: 'UnofficialCrusaderPatch',
  repo: 'UCP3-GUI',
  release_id: release.data.id,
});

const asset = assets.data.filter((r) => r.name === 'latest.json')[0];

const contents = await github.rest.repos.getReleaseAsset({
  owner: 'UnofficialCrusaderPatch',
  repo: 'UCP3-GUI',
  asset_id: asset.id,
  headers: {
    Accept: 'application/octet-stream',
  },
});

writeFileSync('latest.json', Buffer.from(contents.data));
