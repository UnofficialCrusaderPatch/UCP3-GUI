import { ToastType } from '../../components/toasts/toasts-display';
import { getTranslation } from '../../localization/i18n';
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

// eslint-disable-next-line import/prefer-default-export
export async function installUCPFromZip(
  zipFilePath: string,
  gameFolder: string,
  createStatusToast: (type: ToastType, status: string) => void,
): Promise<Result<void, FileUtilError>> {
  return Result.tryAsync(async () => {
    const t = getTranslation(['gui-download']);

    (await createRealBink()).throwIfErr();

    createStatusToast(ToastType.INFO, t('gui-download:zip.extract'));
    try {
      await extractZipToPath(zipFilePath, gameFolder);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw t('gui-download:zip.extract.error', { error });
    }

    // Force a refresh on this atom to ensure activateUCP() is dealing with the right IO state
    await initializeUCPVersion(gameFolder);

    // Force a refresh on this atom to ensure activateUCP() is dealing with the right IO state
    getStore().set(UCP_STATE_ATOM);

    // Activate the UCP by default when installing
    (await activateUCP()).throwIfErr();
  });
}
