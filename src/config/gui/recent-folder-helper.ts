import {
  addGuiConfigRecentFolder,
  getGuiConfigRecentFolders,
  removeGuiConfigRecentFolder,
} from 'tauri/tauri-invoke';

// eslint-disable-next-line import/prefer-default-export
export class RecentFolderHelper {
  static #maxRecentFolders = 10;

  #currentRecent: string[] = [];

  async loadRecentFolders() {
    this.#currentRecent = await getGuiConfigRecentFolders();
  }

  getRecentGameFolders(): string[] {
    return this.#currentRecent.slice(); // not allowed to modify current cache
  }

  getMostRecentGameFolder(): string | '' {
    return this.#currentRecent.length > 0 ? this.#currentRecent[0] : '';
  }

  addToRecentFolders(path: string) {
    addGuiConfigRecentFolder(path); // async, effects only noticeable at next get or load

    // add to cache
    const alreadyThereIndex = this.#currentRecent.findIndex(
      (recentFolder) => recentFolder === path,
    );
    if (alreadyThereIndex !== -1) {
      this.#currentRecent.splice(alreadyThereIndex, 1);
    }
    this.#currentRecent.unshift(path);

    if (
      alreadyThereIndex < 0 &&
      this.#currentRecent.length > RecentFolderHelper.#maxRecentFolders
    ) {
      this.#currentRecent.splice(RecentFolderHelper.#maxRecentFolders); // should keep it in size
    }
  }

  removeFromRecentFolders(path: string) {
    removeGuiConfigRecentFolder(path); // async, effects only noticeable at next get or load

    const alreadyThereIndex = this.#currentRecent.findIndex(
      (recentFolder) => recentFolder === path,
    );
    if (alreadyThereIndex === -1) {
      // Should not happen, but okay, let's just return
      return;
    }
    this.#currentRecent.splice(alreadyThereIndex, 1);
  }
}
