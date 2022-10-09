import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { showError } from './dialog-util';
import { getBaseFolder, proxyFsExists } from './fs-utils';

interface RecentFolder {
  path: string;
  date: number;
}

// eslint-disable-next-line import/prefer-default-export
export class RecentFolderHandler {
  static #recentFoldersFileName = 'recent.json';

  static #maxRecentFolders = 10;

  static #showNotLoadedError(): void {
    showError(
      `There was no attempt to load the recently used folders. This should not happen.`
    );
  }

  #recentFoldersFilePath: string | null = null;

  #currentRecentFolders: RecentFolder[] | null = null;

  async #getRecentFoldersFilePath(): Promise<string> {
    if (this.#recentFoldersFilePath) {
      return this.#recentFoldersFilePath;
    }
    this.#recentFoldersFilePath = `${await getBaseFolder()}${
      RecentFolderHandler.#recentFoldersFileName
    }`;
    return this.#recentFoldersFilePath;
  }

  // most recent first
  #sortRecentFolders(): void {
    if (this.#currentRecentFolders) {
      this.#currentRecentFolders.sort(
        (recentFolderOne, recentFolderTwo) =>
          recentFolderTwo.date - recentFolderOne.date
      );
    }
  }

  #getCurrentRecentFolders(): RecentFolder[] {
    if (!this.#currentRecentFolders) {
      RecentFolderHandler.#showNotLoadedError();
      return [];
    }
    return this.#currentRecentFolders;
  }

  async loadRecentGameFolders() {
    try {
      const fPath = await this.#getRecentFoldersFilePath();
      if (await proxyFsExists(fPath)) {
        this.#currentRecentFolders = JSON.parse(await readTextFile(fPath));
        this.#sortRecentFolders();
        return;
      }
    } catch (error) {
      showError(`Failed to load recently used folders: ${error}`);
    }
    this.#currentRecentFolders = [];
  }

  async saveRecentFolders() {
    try {
      await writeTextFile(
        await this.#getRecentFoldersFilePath(),
        JSON.stringify(this.#getCurrentRecentFolders())
      );
    } catch (error) {
      showError(`Failed to save recently used folders: ${error}`);
    }
  }

  getRecentGameFolders(): string[] {
    return this.#getCurrentRecentFolders().map(
      (recentFolder) => recentFolder.path
    );
  }

  getMostRecentGameFolder(): string | '' {
    const recentFolders = this.#getCurrentRecentFolders();
    return recentFolders.length > 0 ? recentFolders[0].path : '';
  }

  addToRecentFolders(path: string) {
    if (!this.#currentRecentFolders) {
      showError(
        `Recently used game folders were not initialized. No saving happens.`
      );
      return;
    }
    const alreadyThereIndex = this.#currentRecentFolders.findIndex(
      (recentFolder) => recentFolder.path === path
    );
    if (alreadyThereIndex < 0) {
      this.#currentRecentFolders.push({ path, date: Date.now() });
    } else {
      this.#currentRecentFolders[alreadyThereIndex].date = Date.now();
    }
    this.#sortRecentFolders();

    if (
      alreadyThereIndex < 0 &&
      this.#currentRecentFolders.length > RecentFolderHandler.#maxRecentFolders
    ) {
      this.#currentRecentFolders.splice(RecentFolderHandler.#maxRecentFolders); // should keep it in size
    }
  }

  isInitialized(): boolean {
    return !!this.#currentRecentFolders;
  }
}
