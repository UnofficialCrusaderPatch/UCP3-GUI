import { FrameworkUpdateStatus } from './atoms';

// eslint-disable-next-line import/prefer-default-export
export function labelForUpdateStatus(
  updateStatus: FrameworkUpdateStatus | undefined,
  isError: boolean,
  isSettled: boolean,
  isWrongFolder: boolean,
) {
  if (isWrongFolder) return 'overview.folder.invalid';
  if (isError) return 'overview.framework.update.error';
  if (!isSettled) return 'overview.framework.update.fetching';
  // Now we know update Status must exist
  switch (updateStatus!.status) {
    case 'idle': {
      return 'overview.framework.update.idle';
    }
    case 'update': {
      return 'overview.framework.update.available';
    }
    case 'no_update': {
      return 'overview.framework.update.uptodate';
    }
    case 'not_installed': {
      return 'overview.framework.install';
    }
    case 'fetching': {
      return 'overview.framework.update.fetching';
    }
    default: {
      return 'overview.framework.update.error';
    }
  }
}
