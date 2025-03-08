import { getStore } from '../../hooks/jotai/base';
import { MessageType } from '../../localization/localization';
import { copyFile } from '../../tauri/tauri-files';
import Result from '../../util/structs/result';
import {
  BINK_PATHS_ATOM,
  UCP_FILES_STATE_ATOM,
  UCPFilesState,
} from './ucp-state';

// eslint-disable-next-line import/prefer-default-export
export async function activateUCP(): Promise<Result<void, MessageType>> {
  const binkPaths = await getStore().get(BINK_PATHS_ATOM);
  const ucpState = await getStore().get(UCP_FILES_STATE_ATOM);
  switch (ucpState) {
    case UCPFilesState.WRONG_FOLDER:
      return Result.err('bink.missing');
    case UCPFilesState.NOT_INSTALLED:
    case UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK:
      return Result.err('bink.not.installed');
    case UCPFilesState.UNKNOWN:
      return Result.err('bink.unknown.state');
    case UCPFilesState.INVALID:
      return Result.err('bink.invalid.state');
    case UCPFilesState.ACTIVE:
      return Result.emptyOk();
    case UCPFilesState.INACTIVE:
    case UCPFilesState.BINK_VERSION_DIFFERENCE:
    case UCPFilesState.BINK_REAL_COPY_MISSING: {
      if (ucpState === UCPFilesState.BINK_REAL_COPY_MISSING) {
        // copy bink to missing real bink, assuming this case installed manually
        const ucpBinkCopyResult = (
          await copyFile(binkPaths.base, binkPaths.real)
        ).mapErr((error) => ({
          key: 'bink.copy.error',
          args: { error },
        }));
        if (ucpBinkCopyResult.isErr()) {
          return ucpBinkCopyResult;
        }
      }

      const copyResult = (await copyFile(binkPaths.ucp, binkPaths.base)).mapErr(
        (error) => ({
          key: 'bink.copy.ucp.error',
          args: { error },
        }),
      );
      getStore().set(UCP_FILES_STATE_ATOM);
      return copyResult;
    }
    case UCPFilesState.BINK_UCP_MISSING: {
      // copy bink to missing ucp bink, assuming this case installed manually
      const copyResult = (await copyFile(binkPaths.base, binkPaths.ucp)).mapErr(
        (error) => ({
          key: 'bink.copy.error',
          args: { error },
        }),
      );
      getStore().set(UCP_FILES_STATE_ATOM);
      return copyResult;
    }
    default:
      return Result.err('Received unknown UCP state. This should not happen.');
  }
}
