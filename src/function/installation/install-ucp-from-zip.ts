import { exists } from '@tauri-apps/api/fs';
import { ToastType } from '../../components/toasts/toasts-display';
import { Error as FileUtilError } from '../../tauri/tauri-files';
import { extractZipToPath } from '../../tauri/tauri-invoke';
import Result from '../../util/structs/result';
import { UCP_FILES_STATE_ATOM } from '../ucp-files/ucp-state';
import { createRealBink } from '../ucp-files/create-real-bink';
import { activateUCP } from '../ucp-files/activate-ucp';
import { getStore } from '../../hooks/jotai/base';
import { initializeUCPVersion } from '../ucp-files/ucp-version';
import { MessageType } from '../../localization/localization';
import Logger from '../../util/scripts/logging';
import {
  BundledUpdateRollbackError,
  updateBundledExtensions,
} from './update-bundled-extensions';

// eslint-disable-next-line import/prefer-default-export
export async function installUCPFromZip(
  zipFilePath: string,
  gameFolder: string,
  createStatusToast: (type: ToastType, status: MessageType) => void,
): Promise<Result<void, FileUtilError>> {
  return Result.tryAsync(async () => {
    const freshInstall =
      !(await exists(`${gameFolder}/ucp`)) &&
      !(await exists(`${gameFolder}/ucp-config.yml`));
    (await createRealBink()).throwIfErr();

    createStatusToast(ToastType.INFO, 'zip.extract');
    await extractZipToPath(zipFilePath, gameFolder);

    // Force a refresh on this atom to ensure activateUCP() is dealing with the right IO state
    const versionResult = await initializeUCPVersion(gameFolder);
    if (freshInstall && versionResult.status === 'ok') {
      try {
        await updateBundledExtensions(gameFolder, versionResult.version);
      } catch (error) {
        if (error instanceof BundledUpdateRollbackError) throw error;
        new Logger('install-ucp-from-zip.ts')
          .msg(`Using bundled extensions; Store update unavailable: ${error}`)
          .warn();
      }
    }

    // Force a refresh on this atom to ensure activateUCP() is dealing with the right IO state
    getStore().set(UCP_FILES_STATE_ATOM);

    // Activate the UCP by default when installing
    (await activateUCP()).throwIfErr();
  });
}
