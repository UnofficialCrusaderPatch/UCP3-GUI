import { SemVer } from 'semver';
import { ResponseType } from '@tauri-apps/api/http';
import Logger from '../../util/scripts/logging';
import { UCP3_REPO_GIST_URL } from './download-enums';
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
    LOGGER.msg('fetchUpdate').info();
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
