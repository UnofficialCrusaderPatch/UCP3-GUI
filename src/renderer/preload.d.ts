import { Channels } from 'main/preload';

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
        getExtensions(gameFolder: string): object;
      };
    };
  }
}

export {};
