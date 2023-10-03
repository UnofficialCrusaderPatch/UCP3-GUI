import { tempdir } from '@tauri-apps/api/os';
import {
  createDir,
  BaseDirectory,
  removeDir,
  exists,
  readDir,
  renameFile,
} from '@tauri-apps/api/fs';
import { ZipReader } from 'util/structs/zip-handler';
import { error } from 'util/scripts/logging';
import { extractZipToPath } from 'tauri/tauri-invoke';

class ExtensionPack {
  path: string;

  private constructor(path: string) {
    this.path = path;
  }

  async hasPluginsFolder() {
    const pluginsExist = await exists(`${this.path}/plugins/`, {
      dir: BaseDirectory.Temp,
    });

    return pluginsExist;
  }

  async hasModulesFolder() {
    const modulesExist = await exists(`${this.path}/modules/`, {
      dir: BaseDirectory.Temp,
    });

    return modulesExist;
  }

  async install(ucpFolder: string) {
    const hasPlugins = await this.hasPluginsFolder();
    if (hasPlugins) {
      const entries = await readDir(`${this.path}/plugins/`, {
        dir: BaseDirectory.Temp,
        recursive: false,
      });

      const promises = entries.map(async (entry) => {
        if (entry.children === null || entry.children === undefined) {
          error(`Found a non-directory file in extension pack: ${entry.path}`);
          throw Error(
            `Found a non-directory file in extension pack: ${entry.path}`
          );
        }

        if (entry.name === undefined) {
          error(`Found a non-valid path in extension pack: ${entry.path}`);
          throw Error(
            `Found a non-valid path in extension pack: ${entry.path}`
          );
        }

        const destination = `${ucpFolder}/plugins/${entry.name}`;

        if (await exists(destination)) {
          // error(`Path already exists: ${destination}`);
          // throw Error(`Path already exists: ${destination}`);
          // Just skip
        }

        return renameFile(entry.path, destination).catch((reason) => {
          error(reason);
        });
      });

      await Promise.all(promises);
    }
    const hasModules = await this.hasModulesFolder();
    if (hasModules) {
      const entries = await readDir(`${this.path}/modules/`, {
        dir: BaseDirectory.Temp,
        recursive: false,
      });

      const promises = entries.map(async (entry) => {
        if (entry.children !== null && entry.children !== undefined) {
          error(`Found a directory file in extension pack: ${entry.path}`);
          throw Error(
            `Found a directory file in extension pack: ${entry.path}`
          );
        }

        if (entry.name === undefined) {
          error(`Found a non-valid path in extension pack: ${entry.path}`);
          throw Error(
            `Found a non-valid path in extension pack: ${entry.path}`
          );
        }

        if (!entry.name.endsWith('.zip')) {
          error(`Found a non-zip file in extension pack: ${entry.path}`);
          throw Error(
            `Found a non-valid path in extension pack: ${entry.path}`
          );
        }

        const destination = `${ucpFolder}/modules/${entry.name}`;

        if (await exists(destination)) {
          // error(`Path already exists: ${destination}`);
          // throw Error(`Path already exists: ${destination}`);
          // Just skip
        }

        return renameFile(entry.path, destination).catch((reason) => {
          error(reason);
        });
      });

      await Promise.all(promises);
    }
  }

  async close() {
    await removeDir(this.path, { dir: BaseDirectory.Temp, recursive: true });
  }

  static async fromPath(path: string) {
    const tempPath = `ucp3-gui-pack-${new Date().getTime()}`;
    await ZipReader.withZipReaderDo(path, async (reader) => {
      const pluginsExist = await reader.doesEntryExist('plugins/');
      const modulesExist = await reader.doesEntryExist('modules/');
      if (!pluginsExist && !modulesExist) {
        throw new Error(
          `Zip file does not contain a plugins nor a modules directory. Not an extension pack!`
        );
      }
    });

    await createDir(tempPath, { dir: BaseDirectory.Temp });

    const tempDirBase = await tempdir();

    await extractZipToPath(path, `${tempDirBase}/${tempPath}`);

    return new ExtensionPack(tempPath);
  }
}

export default ExtensionPack;
