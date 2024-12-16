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
export async function createRealBink(): Promise<Result<void, MessageType>> {
  const binkPaths = await getStore().get(BINK_PATHS_ATOM);
  switch (await getStore().get(UCP_FILES_STATE_ATOM)) {
    case UCPFilesState.WRONG_FOLDER:
      return Result.err('bink.missing');
    case UCPFilesState.BINK_REAL_COPY_MISSING: // safe, since verified
    case UCPFilesState.NOT_INSTALLED: {
      const copyResult = (
        await copyFile(binkPaths.base, binkPaths.real)
      ).mapErr((error) => ({ key: 'bink.copy.error', args: { error } }));
      getStore().set(UCP_FILES_STATE_ATOM);
      return copyResult;
    }
    case UCPFilesState.UNKNOWN:
      return Result.err('bink.unknown.state');
    case UCPFilesState.INVALID:
      return Result.err('bink.invalid.state');
    default:
      return Result.emptyOk();
  }
}
