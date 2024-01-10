import { TFunction } from 'i18next';
import { Error as FileUtilError } from '../../tauri/tauri-files';
import { extractZipToPath } from '../../tauri/tauri-invoke';
import Result from '../../util/structs/result';
import {
  UCP_STATE_ATOM,
  activateUCP,
  createRealBink,
} from '../ucp-files/ucp-state';
import { getStore } from '../../hooks/jotai/base';
import { UCP_VERSION_ATOM } from '../ucp-files/ucp-version';

// eslint-disable-next-line import/prefer-default-export
export async function installUCPFromZip(
  zipFilePath: string,
  gameFolder: string,
  statusCallback: (status: string) => void,
  t: TFunction,
): Promise<Result<void, FileUtilError>> {
  return Result.tryAsync(async () => {
    (await createRealBink()).throwIfErr();

    statusCallback(t('gui-download:zip.extract'));
    try {
      await extractZipToPath(zipFilePath, gameFolder);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw t('gui-download:zip.extract.error', { error });
    }

    // Force a refresh on this atom to ensure activateUCP() is dealing with the right IO state
    getStore().set(UCP_VERSION_ATOM);

    // Force a refresh on this atom to ensure activateUCP() is dealing with the right IO state
    getStore().set(UCP_STATE_ATOM);

    // Activate the UCP by default when installing
    (await activateUCP()).throwIfErr();
  });
}