import axios from 'axios';
import { SemVer } from 'semver';
import { ResponseType } from '@tauri-apps/api/http';
import Logger, { ConsoleLogger } from '../../util/scripts/logging';
import {
  UCP3_REPOS_MACHINE_TOKEN,
  UCP3_REPO_GIST_URL,
  UCP3_REPO_URL_API,
} from './download-enums';
import { fetch } from '../../tauri/tauri-http';

const LOGGER = new Logger('github.ts');

export type UCP3ReleaseMeta = {
  version: string;
  notes: string;
  pub_date: string;
  build_date: Date;
  base_url: string;
  sha: string;
  builds: { Developer: { url: string }; Release: { url: string } };
};

export type UpdateData = {
  name: string;
  data: Uint8Array;
};

export class UCP3Updater {
  version: string;

  sha: string;

  meta?: UCP3ReleaseMeta;

  date: Date;

  constructor(currentVersion: string, currentSha: string, buildDate: Date) {
    this.version = currentVersion;
    this.sha = currentSha;
    this.date = buildDate;
  }

  async fetchMeta() {
    const response = await fetch(UCP3_REPO_GIST_URL, {
      method: 'GET',
      responseType: ResponseType.JSON,
    });

    if (response.status !== 200) {
      throw Error(`fetchMeta: ${response.status}`);
    }

    const raw = response.data as unknown as UCP3ReleaseMeta;
    this.meta = {
      ...raw,
      build_date: new Date(`${raw.build_date}`),
    } as unknown as UCP3ReleaseMeta;

    return this.meta;
  }

  async doesUpdateExist() {
    if (this.meta === undefined) {
      this.meta = await this.fetchMeta();
    }

    const currentVersion = new SemVer(this.version);
    const remoteVersion = new SemVer(this.meta.version);
    if (remoteVersion > currentVersion) {
      return true;
    }

    if (
      !this.sha.startsWith(this.meta.sha) &&
      this.meta.build_date > this.date
    ) {
      return true;
    }

    return false;
  }

  async fetchUpdate() {
    ConsoleLogger.info('fetchUpdate');
    if (this.meta === undefined) {
      this.meta = await this.fetchMeta();
    }

    const result = await fetch(`${this.meta.builds.Release.url}`, {
      responseType: ResponseType.Binary,
      method: 'GET',
    });

    if (result.status !== 200) {
      throw Error(`fetchUpdate: ${result.status}`);
    }

    return {
      name: `${this.meta.builds.Release.url.split('/').splice(-1).at(0)}`,
      data: new Uint8Array(result.data as Array<number>),
    } as UpdateData;
  }
}

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
      LOGGER.obj(error).error();
      window.alert(error);
    });

  // TODO: there should be a proper "no/failed connection"-handling

  return result;
}

export async function getLatestUCP3Artifacts() {
  const result = await axios
    .get(`${UCP3_REPO_URL_API}/actions/artifacts`, {
      auth: { username: 'ucp3-machine', password: UCP3_REPOS_MACHINE_TOKEN },
    })
    .then((res: { data: { artifacts: unknown } }) => {
      LOGGER.obj(res).error();
      return res.data.artifacts;
    })
    .catch((error: Error) => {
      LOGGER.obj(error).error();
    });
  return result;
}

// eslint-disable-next-line import/prefer-default-export
export { checkForLatestUCP3DevReleaseUpdate, UCP3_REPOS_MACHINE_TOKEN };
