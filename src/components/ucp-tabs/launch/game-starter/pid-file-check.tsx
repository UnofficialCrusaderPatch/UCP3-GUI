import semver from 'semver';
import { GAME_FOLDER_ATOM } from '../../../../function/game-folder/interface';
import { UCP_SIMPLIFIED_VERSION_ATOM } from '../../../../function/ucp-files/ucp-version';
import { getStore } from '../../../../hooks/jotai/base';
import { readDir } from '../../../../tauri/tauri-files';
import Logger from '../../../../util/scripts/logging';
import { makeToast, ToastType } from '../../../toasts/toasts-display';
import { setOverlayContent } from '../../../overlay/overlay';
import { Troubleshooting } from '../../../troubleshooting/troubleshooting-window';

const LOGGER = new Logger('pid-file-check.ts');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TEST = import.meta.env.DEV;

// eslint-disable-next-line import/prefer-default-export
export async function pidFileCheck() {
  LOGGER.msg('pid file check').debug();
  const gamefolder = getStore().get(GAME_FOLDER_ATOM);
  const { version } = getStore().get(UCP_SIMPLIFIED_VERSION_ATOM);
  const sv = new semver.SemVer(version);
  if (!TEST && sv.compare('3.0.6') === -1) {
    LOGGER.msg('pid file check: not supported').debug();
    return;
  }
  const pidFilesResult = await readDir(gamefolder);
  if (pidFilesResult.isOk()) {
    const pidFiles = pidFilesResult.getOrThrow();
    const needles = pidFiles.filter((fe) => {
      return fe.path.indexOf('ucp-pid-') !== -1;
    });
    if (needles.length === 0) {
      LOGGER.msg('pid file check: game dead').debug();
      // Game may not have started properly, suggest troubleshooting
      makeToast({
        title: 'troubleshooting.launch.fail.title',
        body: 'troubleshooting.launch.fail.body',
        type: ToastType.WARN,
        onClick: () => {
          setOverlayContent(Troubleshooting);
        },
        customDelay: 10000,
      });
    } else {
      LOGGER.msg('pid file check: game alive').debug();
    }
  } else {
    LOGGER.msg('pid file check: fail').debug();
  }
}
