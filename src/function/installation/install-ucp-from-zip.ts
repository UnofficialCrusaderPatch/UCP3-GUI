import { ToastType } from '../../components/toasts/toasts-display';
import { Error as FileUtilError } from '../../tauri/tauri-files';
import { extractZipToPath } from '../../tauri/tauri-invoke';
import Result from '../../util/structs/result';
import {
  UCP_STATE_ATOM,
  activateUCP,
  createRealBink,
} from '../ucp-files/ucp-state';
import { getStore } from '../../hooks/jotai/base';
import { initializeUCPVersion } from '../ucp-files/ucp-version';
import { Message } from '../../localization/localization';

// eslint-disable-next-line import/prefer-default-export
export async function installUCPFromZip(
  zipFilePath: string,
  gameFolder: string,
  createStatusToast: (type: ToastType, status: Message) => void,
): Promise<Result<void, FileUtilError>> {
  return Result.tryAsync(async () => {
    (await createRealBink()).throwIfErr();

    createStatusToast(ToastType.INFO, 'zip.extract');
    await extractZipToPath(zipFilePath, gameFolder);

    // Force a refresh on this atom to ensure activateUCP() is dealing with the right IO state
    await initializeUCPVersion(gameFolder);

    // Force a refresh on this atom to ensure activateUCP() is dealing with the right IO state
    getStore().set(UCP_STATE_ATOM);

    // Activate the UCP by default when installing
    (await activateUCP()).throwIfErr();
  });
}
