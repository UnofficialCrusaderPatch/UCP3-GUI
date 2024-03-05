import { tempdir } from '@tauri-apps/api/os';
import {
  createDir,
  BaseDirectory,
  removeDir,
  exists,
  readDir,
  renameFile,
} from '@tauri-apps/api/fs';
import { extractZipToPath } from '../../../tauri/tauri-invoke';
import { ZipReader } from '../../../util/structs/zip-handler';
import Logger from '../../../util/scripts/logging';
import { showModalOk } from '../../../components/modals/modal-ok';

const LOGGER = new Logger('extension-pack.ts');

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
          const errorMsg = `Found a non-directory file in extension pack: ${entry.path}`;
          LOGGER.msg(errorMsg).error();
          return new Promise<void>((resolve) => {
            resolve();
          });
        }

        if (entry.name === undefined) {
          const errorMsg = `Found a non-valid path in extension pack: ${entry.path}`;
          LOGGER.msg(errorMsg).error();
          throw Error(errorMsg);
        }

        const destination = `${ucpFolder}/plugins/${entry.name}`;

        if (await exists(destination)) {
          // error(`Path already exists: ${destination}`);
          // throw Error(`Path already exists: ${destination}`);
          // Just skip
          return new Promise<void>((resolve) => {
            resolve();
          });
        }

        return renameFile(entry.path, destination).catch((reason) => {
          LOGGER.obj(reason).error();
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
          const errorMsg = `Found a directory file in extension pack: ${entry.path}`;
          LOGGER.msg(errorMsg).error();
          throw Error(errorMsg);
        }

        if (entry.name === undefined) {
          const errorMsg = `Found a non-valid path in extension pack: ${entry.path}`;
          LOGGER.msg(errorMsg).error();
          throw Error(errorMsg);
        }

        if (!entry.name.endsWith('.zip') && !entry.name.endsWith('.sig')) {
          const errorMsg = `Found a non-zip file in extension pack: ${entry.path}`;
          LOGGER.msg(errorMsg).error();

          // Skip it
          return new Promise<void>((resolve) => {
            resolve();
          });
        }

        const destination = `${ucpFolder}/modules/${entry.name}`;

        if (await exists(destination)) {
          // error(`Path already exists: ${destination}`);
          // throw Error(`Path already exists: ${destination}`);
          // Just skip
          return new Promise<void>((resolve) => {
            resolve();
          });
        }

        return renameFile(entry.path, destination).catch(async (reason) => {
          LOGGER.obj(reason).error();
          await showModalOk({
            title: 'An error occurred',
            message: `An error occurred trying to install ${entry.name}. Not all files could be placed.`,
          });
        });
      });

      await Promise.all(promises);
    }
  }

  async close() {
    await removeDir(this.path, { dir: BaseDirectory.Temp, recursive: true });
  }

  static async isPack(path: string) {
    let result = false;

    await ZipReader.withZipReaderDo(path, async (reader) => {
      const pluginsExist = await reader.doesEntryExist('plugins/');
      const modulesExist = await reader.doesEntryExist('modules/');
      if (!pluginsExist && !modulesExist) {
        result = false;
      } else {
        result = true;
      }
    });

    return result;
  }

  static async fromPath(path: string) {
    if (!(await this.isPack(path))) {
      throw new Error(
        `Zip file does not contain a plugins nor a modules directory. Not an extension pack!`,
      );
    }

    const tempPath = `ucp3-gui-pack-${new Date().getTime()}`;

    await createDir(tempPath, { dir: BaseDirectory.Temp });

    const tempDirBase = await tempdir();

    await extractZipToPath(path, `${tempDirBase}/${tempPath}`);

    return new ExtensionPack(tempPath);
  }
}

export default ExtensionPack;
