import { Channels } from 'main/preload';

import { Extension } from '../common/config/common';

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        sendMessage(channel: Channels, args: unknown[]): void;
        on(
          channel: string,
          func: (...args: unknown[]) => void
        ): (() => void) | undefined;
        once(channel: string, func: (...args: unknown[]) => void): void;
      };
      ucpBackEnd: {
        getRecentGameFolders(): {
          index: number;
          folder: string;
          date: string;
        }[];
        openFolderDialog(): string;
        createEditorWindow(gameFolder: string): void;
        getYamlDefinition(gameFolder: string): {
          flat: object[];
          hierarchical: {
            elements: object[];
            sections: { [key: string]: object };
          };
        };
        checkForUCP3Updates(): {
          update: boolean;
          file: string;
          downloaded: boolean;
          installed: boolean;
        };
        downloadUCP3Update(update: unknown): string;
        saveUCPConfig(config: object, gameFolder: string): void;
        loadConfigFromFile(): {
          modules: {
            [key: string]: {
              active: boolean;
              version: string;
              options: { [key: string]: unknown };
            };
          };
          plugins: {
            [key: string]: {
              active: boolean;
              version: string;
              options: { [key: string]: unknown };
            };
          };
        };
        getExtensions(gameFolder: string): Extension[];
        getUCPVersion(gameFolder: string): {
          major: number;
          minor: number;
          patch: number;
          sha: string;
          build: string;
        };
        getGitHubLatestUCP3Artifacts(): object;
        getCurrentFolder(): void;
        openFileDialog(
          filters: { name: string; extensions: string[] }[]
        ): string;
        installUCPFromZip(zipFilePath: string): void;
        getGameFolderPath(): string;
        reloadWindow(): void;
      };
    };
  }
}

export {};
