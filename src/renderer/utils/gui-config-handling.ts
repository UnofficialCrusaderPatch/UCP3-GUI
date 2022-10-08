import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import { showError, showWarning } from "./dialog-util";
import { getBaseFolder, proxyFsExists } from "./fs-utils";

interface RecentFolder {
    path: string;
    date: number;
}

interface GuiConfig {
    recentFolderPaths: RecentFolder[];
}

export class GuiConfigHandler {
    static #guiConfigFileName: string = "recent.json";
    static #maxRecentFolders: number = 10;
    static #messageTitle: string = "GUI-Configuration";

    static #showNotLoadedError(): void {
        showError(`There was no attempt to load the recently used folders. This should not happen.`,
            GuiConfigHandler.#messageTitle);
    }


    #guiConfigFilePath: string | null = null;
    #currentGuiConfig: GuiConfig | null = null;

    async #getRecentFoldersFilePath(): Promise<string> {
        if (this.#guiConfigFilePath) {
            return this.#guiConfigFilePath;
        }
        this.#guiConfigFilePath = `${await getBaseFolder()}${GuiConfigHandler.#guiConfigFileName}`;
        return this.#guiConfigFilePath;
    }

    // most recent first
    #sortRecentFolders(): void {
        if (this.#currentGuiConfig) {
            this.#currentGuiConfig.recentFolderPaths.sort(
                (recentFolderOne, recentFolderTwo) => recentFolderTwo.date - recentFolderOne.date
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

    #createNewConfig(): void {
        this.#currentGuiConfig = {
            recentFolderPaths: []
        };
    }

    // no idea if there are better ways
    #validateConfig(): boolean {
        const thisConfig = this.#currentGuiConfig;
        return typeof thisConfig === "object" && Array.isArray(thisConfig?.recentFolderPaths);
    }

    async loadGuiConfig() {
        try {
            const fPath = await this.#getRecentFoldersFilePath();
            if (await proxyFsExists(fPath)) {
                this.#currentGuiConfig = JSON.parse(await readTextFile(fPath));
                if (this.#validateConfig()) {
                    this.#sortRecentFolders();
                    return;
                } else {
                    showWarning("The current GUI config does not fit the structure and is discarded.",
                        GuiConfigHandler.#messageTitle);
                }
            }
        } catch (error) {
            showError(`Failed to load recently used folders:\n${error}`, GuiConfigHandler.#messageTitle);
        }
        this.#createNewConfig();
    }

    async saveGuiConfig() {
        try {
            if (!this.#validateConfig) {
                throw "Current configuration structure is invalid.";
            }
            await writeTextFile(await this.#getRecentFoldersFilePath(),
                JSON.stringify(this.#currentGuiConfig));
        } catch (error) {
            // needs to await, since it is called during shutdown
            await showError(`Failed to save GUI configuration:\n${error}`, GuiConfigHandler.#messageTitle);
        }
    }

    getRecentGameFolders(): string[] {
        return this.#getCurrentRecentFolders().map(recentFolder => recentFolder.path);
    }

    getMostRecentGameFolder(): string | "" {
        const recentFolders = this.#getCurrentRecentFolders();
        return recentFolders.length > 0 ? recentFolders[0].path : "";
    }

    addToRecentFolders(path: string) {
        if (!this.#currentGuiConfig) {
            showError(`Recently used game folders were not initialized. No saving happens.`,
                GuiConfigHandler.#messageTitle);
            return;
        }
        const recentFolders = this.#currentGuiConfig.recentFolderPaths;
        const alreadyThereIndex = recentFolders.findIndex(recentFolder => recentFolder.path === path);
        if (alreadyThereIndex < 0) {
            recentFolders.push({ path: path, date: Date.now() });
        } else {
            recentFolders[alreadyThereIndex].date = Date.now();
        }
        this.#sortRecentFolders();

        if (alreadyThereIndex < 0 && recentFolders.length > GuiConfigHandler.#maxRecentFolders) {
            recentFolders.splice(GuiConfigHandler.#maxRecentFolders); // should keep it in size
        }
    }

    isInitialized(): boolean {
        return !!this.#currentGuiConfig;
    }
}