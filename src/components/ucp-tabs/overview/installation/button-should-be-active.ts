import { UCPFilesState } from '../../../../function/ucp-files/ucp-state';
import Logger from '../../../../util/scripts/logging';
import { FrameworkUpdateStatus } from './atoms';

const LOGGER = new Logger('button-should-be-active.ts');

// eslint-disable-next-line import/prefer-default-export
export function shouldBeActive(states: {
  isGameFolder: boolean;
  isUpdateQueryResolved: boolean;
  isFolder: boolean;
  updateStatus: FrameworkUpdateStatus;
  filesState: UCPFilesState;
}) {
  const {
    isGameFolder,
    isUpdateQueryResolved,
    isFolder,
    updateStatus,
    filesState,
  } = states;

  if (!isFolder) {
    LOGGER.msg(`Inactive: Current game folder is empty`).warn();
    return false;
  }

  if (filesState === UCPFilesState.WRONG_FOLDER) {
    LOGGER.msg(
      `Inactive: Current game folder is not a valid game folder`,
    ).warn();
    return false;
  }

  if (
    filesState === UCPFilesState.NOT_INSTALLED ||
    filesState === UCPFilesState.INVALID ||
    filesState === UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK ||
    filesState === UCPFilesState.UNKNOWN ||
    filesState === UCPFilesState.BINK_REAL_COPY_MISSING ||
    filesState === UCPFilesState.BINK_UCP_MISSING ||
    filesState === UCPFilesState.BINK_VERSION_DIFFERENCE
  ) {
    LOGGER.msg(
      `Active: Current game folder has either no installation, an invalid installation, or an unknown state`,
    ).info();
    return true;
  }

  if (!isUpdateQueryResolved) {
    if (filesState === UCPFilesState.ACTIVE) {
      LOGGER.msg(
        `Inactive: The installation is active and there is no update`,
      ).info();
      return false;
    }
  }

  // This shouldn't be necessary since we already checked for not installed
  // with a different method
  if (updateStatus.status === 'not_installed') {
    if (isFolder) {
      if (isGameFolder) {
        LOGGER.msg(`Active: There is no installation`).info();
        return true;
      }
    }
  }

  if (updateStatus.status === 'update') {
    LOGGER.msg(`Active: update available`).info();
    return true;
  }

  LOGGER.msg(`Active: no update available`).info();
  return false;
}
