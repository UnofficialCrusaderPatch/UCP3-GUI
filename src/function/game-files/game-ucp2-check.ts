import { atom } from 'jotai';
import {
  basename,
  onFsExists,
  scanFileForBytes,
} from '../../tauri/tauri-files';
import { EXTREME_PATH_ATOM, VANILLA_PATH_ATOM } from './game-path';
import { ToastType, makeToast } from '../../components/toasts/toasts-display';
import { showModalOk } from '../../components/modals/modal-ok';

const UCP2_MARK = '.ucp';
const BYTES_TO_SCAN = 1000;

async function checkIfUCP2Installed(path: string) {
  if (!path) {
    return false;
  }
  const filename = await basename(path).catch(() => 'NONE');

  const result = await scanFileForBytes(path, UCP2_MARK, BYTES_TO_SCAN);
  if (result.isErr()) {
    const exeExists = await onFsExists(path).catch(() => false);
    if (!exeExists) return false;

    makeToast({
      title: 'launch',
      body: {
        key: 'launch.ucp2.check.fail',
        args: {
          file: filename,
          reason: String(result.err().get()),
        },
      },
      type: ToastType.ERROR,
    });
  }
  const ucp2Present = result.ok().get().isPresent();
  if (ucp2Present) {
    await showModalOk({
      title: 'launch.ucp2.check.title',
      message: {
        key: 'launch.ucp2.check.message',
        args: {
          file: filename,
        },
      },
    });
  }
  return ucp2Present;
}

export const VANILLA_UCP2_ATOM = atom(async (get) =>
  checkIfUCP2Installed(await get(VANILLA_PATH_ATOM)),
);

export const EXTREME_UCP2_ATOM = atom(async (get) =>
  checkIfUCP2Installed(await get(EXTREME_PATH_ATOM)),
);
