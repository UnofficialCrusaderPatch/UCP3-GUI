import { readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { showError, showWarning } from './dialog-util';
import { getBaseFolder, proxyFsExists } from './fs-utils';

interface RecentFolder {
  path: string;
  date: number;
}

interface GuiConfig {
  language: string;
  recentFolderPaths: RecentFolder[];
}

// eslint-disable-next-line import/prefer-default-export
export class GuiConfigHandler {
  static #guiConfigFileName = 'recent.json';

  static #maxRecentFolders = 10;

  static #messageTitle = 'GUI-Configuration';

  static #showNotLoadedError(): void {
    showError(
      `There was no attempt to load the recently used folders. This should not happen.`,
      GuiConfigHandler.#messageTitle
    );
  }

  static #isRecentFolderObject(recentFolder: RecentFolder): boolean {
    return (
      recentFolder &&
      typeof recentFolder?.path === 'string' &&
      typeof recentFolder?.date === 'number'
    );
  }

  static #createNewConfig(): GuiConfig {
    return {
      language: 'en',
      recentFolderPaths: [],
    };
  }

  #guiConfigFilePath: string | null = null;

  #currentGuiConfig: GuiConfig | null = null;

  async #getRecentFoldersFilePath(): Promise<string> {
    if (this.#guiConfigFilePath) {
      return this.#guiConfigFilePath;
    }
    this.#guiConfigFilePath = `${await getBaseFolder()}${
      GuiConfigHandler.#guiConfigFileName
    }`;
    return this.#guiConfigFilePath;
  }

  // most recent first
  #sortRecentFolders(): void {
    if (this.#currentGuiConfig) {
      this.#currentGuiConfig.recentFolderPaths.sort(
        (recentFolderOne, recentFolderTwo) =>
          recentFolderTwo.date - recentFolderOne.date
      );
    }
  }

  #getCurrentRecentFolders(): RecentFolder[] {
    if (!this.#currentGuiConfig) {
      GuiConfigHandler.#showNotLoadedError();
      return [];
    }
    return this.#currentGuiConfig.recentFolderPaths;
  }

  // no idea if there are better ways
  #addToCurrentConfig(loadedConfig: GuiConfig): void {
    const thisConfig = this.#currentGuiConfig as GuiConfig;

    const loadedRecentFolderPaths = loadedConfig?.recentFolderPaths;
    if (
      Array.isArray(loadedRecentFolderPaths) &&
      loadedRecentFolderPaths.length > 0 &&
      !loadedRecentFolderPaths.filter(
        (recentFolder) => !GuiConfigHandler.#isRecentFolderObject(recentFolder)
      ).length
    ) {
      thisConfig.recentFolderPaths = loadedRecentFolderPaths;
    }

    const loadedLanguage = loadedConfig?.language;
    if (loadedLanguage && typeof loadedLanguage === 'string') {
      thisConfig.language = loadedLanguage;
    }
  }

  async loadGuiConfig() {
    this.#currentGuiConfig = GuiConfigHandler.#createNewConfig();
    try {
      const fPath = await this.#getRecentFoldersFilePath();
      if (await proxyFsExists(fPath)) {
        this.#addToCurrentConfig(JSON.parse(await readTextFile(fPath)));
        this.#sortRecentFolders();
        return;
      }
    } catch (error) {
      showError(
        `Failed to load recently used folders:\n${error}`,
        GuiConfigHandler.#messageTitle
      );
    }
  }

  async saveGuiConfig() {
    try {
      await writeTextFile(
        await this.#getRecentFoldersFilePath(),
        JSON.stringify(this.#currentGuiConfig)
      );
    } catch (error) {
      // needs to await, since it is called during shutdown
      await showError(
        `Failed to save GUI configuration:\n${error}`,
        GuiConfigHandler.#messageTitle
      );
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
    if (!this.#currentGuiConfig) {
      showError(
        `Recently used game folders were not initialized. No saving happens.`,
        GuiConfigHandler.#messageTitle
      );
      return;
    }
    const recentFolders = this.#currentGuiConfig.recentFolderPaths;
    const alreadyThereIndex = recentFolders.findIndex(
      (recentFolder) => recentFolder.path === path
    );
    if (alreadyThereIndex < 0) {
      recentFolders.push({ path, date: Date.now() });
    } else {
      recentFolders[alreadyThereIndex].date = Date.now();
    }
    this.#sortRecentFolders();

    if (
      alreadyThereIndex < 0 &&
      recentFolders.length > GuiConfigHandler.#maxRecentFolders
    ) {
      recentFolders.splice(GuiConfigHandler.#maxRecentFolders); // should keep it in size
    }
  }

  removeFromRecentFolders(path: string) {
    if (!this.#currentGuiConfig) {
      showError(
        `Recently used game folders were not initialized. No saving happens.`,
        GuiConfigHandler.#messageTitle
      );
      return;
    }
    const recentFolders = this.#currentGuiConfig.recentFolderPaths;
    const alreadyThereIndex = recentFolders.findIndex(
      (recentFolder) => recentFolder.path === path
    );
    if (alreadyThereIndex === -1) {
      // Should not happen, but okay, let's just return
      return;
    }
    recentFolders.splice(alreadyThereIndex, 1);
  }

  getLanguage(): string | undefined {
    if (!this.#currentGuiConfig) {
      GuiConfigHandler.#showNotLoadedError();
      return undefined;
    }
    return this.#currentGuiConfig?.language;
  }

  setLanguage(lang: string) {
    if (!this.#currentGuiConfig) {
      GuiConfigHandler.#showNotLoadedError();
    } else {
      this.#currentGuiConfig.language = lang;
    }
  }

  isInitialized(): boolean {
    return !!this.#currentGuiConfig;
  }
}
