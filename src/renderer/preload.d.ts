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
        browseGameFolder(): string;
        initializeMenuWindow(gameFolder: string): void;
        getYamlDefinition(gameFolder: string): {
          flat: object[];
          hierarchical: object;
        };
        saveUCPConfig(config: object, gameFolder: string): void;
        loadConfigFromFile(): object;
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
      };
    };
  }
}

export {};
