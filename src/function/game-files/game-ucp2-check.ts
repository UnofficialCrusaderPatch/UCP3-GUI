import { atom } from 'jotai';
import { Atom } from 'jotai/vanilla';
import {
  basename,
  onFsExists,
  scanFileForBytes,
} from '../../tauri/tauri-files';
import EXE_PATHS_ATOM from './game-path';
import { ToastType, makeToast } from '../../components/toasts/toasts-display';
import { showModalOk } from '../../components/modals/modal-ok';
import { GameDataWrapper } from './game-data';

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
    showModalOk({
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

const UCP2_STATE_ATOM: Atom<Promise<GameDataWrapper<boolean>>> = atom(
  async (get) => {
    const exePaths = await get(EXE_PATHS_ATOM);
    return {
      vanilla: await checkIfUCP2Installed(exePaths.vanilla),
      extreme: await checkIfUCP2Installed(exePaths.extreme),
    };
  },
);

export default UCP2_STATE_ATOM;
