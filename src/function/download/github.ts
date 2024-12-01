import { SemVer } from 'semver';
import { ResponseType } from '@tauri-apps/api/http';
import Logger from '../../util/scripts/logging';
import { UCP3_REPO_GIST_URL } from './download-enums';
import { ProgressHandler, download, fetch } from '../../tauri/tauri-http';
import { getStore } from '../../hooks/jotai/base';
import { GAME_FOLDER_ATOM } from '../game-folder/interface';

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

  #setVersion(version: string) {
    this.version = version;
  }

  #setSHA(sha: string) {
    this.sha = sha;
  }

  #setDate(date: Date) {
    this.date = date;
  }

  setVersionInfo(version: string, sha: string, date: Date) {
    this.meta = undefined;

    this.#setVersion(version);
    this.#setSHA(sha);
    this.#setDate(date);

    return this;
  }

  static DUMMY = new UCP3Updater('0.0.0', '', new Date(0));

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

  cachedMeta() {
    return this.meta;
  }

  /**
   * Important: assumes fetchMeta() has been called
   * @returns boolean
   */
  hasUpdate() {
    if (this.meta === undefined) {
      LOGGER.msg(
        `updater meta is undefined, pretending there isn't an update`,
      ).warn();
      return false;
    }

    const currentVersion = new SemVer(this.version);
    const remoteVersion = new SemVer(this.meta.version);
    if (currentVersion.compare(remoteVersion) !== 0) {
      // Return true if currentVersion is less than the remote version
      return currentVersion.compare(remoteVersion) === -1;
    }

    // If the versions are equal, then check the SHA
    // and the build date, which is not implemented currently (comparison is always true)
    if (
      !this.sha.startsWith(this.meta.sha) &&
      this.meta.build_date > this.date
    ) {
      return true;
    }

    return false;
  }

  async doesUpdateExist() {
    if (this.meta === undefined) {
      this.meta = await this.fetchMeta();
    }

    return this.hasUpdate();
  }

  async fetchUpdateToGamefolder(
    type: 'Release' | 'Developer',
    progressHandler?: ProgressHandler,
  ) {
    const folder = getStore().get(GAME_FOLDER_ATOM);

    if (this.meta === undefined) {
      this.meta = await this.fetchMeta();
    }

    const { url } = this.meta.builds[type];

    const fileName = `${url.split('/').splice(-1).at(0)}`;
    const destination = `${folder}/${fileName}`;

    await download(url, destination, progressHandler);

    return {
      name: fileName,
      path: destination,
    };
  }

  async fetchUpdate(type: 'Release' | 'Developer') {
    LOGGER.msg('fetchUpdate').info();
    if (this.meta === undefined) {
      this.meta = await this.fetchMeta();
    }

    const fileName = `${this.meta.builds[type].url.split('/').splice(-1).at(0)}`;

    const result = await fetch(`${this.meta.builds[type].url}`, {
      responseType: ResponseType.Binary,
      method: 'GET',
    });

    if (result.status !== 200) {
      throw Error(`fetchUpdate: ${result.status}`);
    }

    return {
      name: fileName,
      data: new Uint8Array(result.data as Array<number>),
    } as UpdateData;
  }
}
