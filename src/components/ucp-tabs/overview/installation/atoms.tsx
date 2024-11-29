import { atomWithQuery } from 'jotai-tanstack-query';
import { atom } from 'jotai';
import { UCP3Updater } from '../../../../function/download/github';
import { UCP_SIMPLIFIED_VERSION_ATOM } from '../../../../function/ucp-files/ucp-version';
import { getStore } from '../../../../hooks/jotai/base';
import { makeToast, ToastType } from '../../../toasts/toasts-display';
import { CURRENT_DISPLAYED_TAB } from '../../tabs-state';
import Logger from '../../../../util/scripts/logging';

const LOGGER = new Logger('framework-updater-atom.ts');

type ErrorFrameworkUpdateStatus = {
  status: 'error';
  message: string;
};

type IdleFrameworkUpdateStatus = {
  status: 'idle';
};

type FetchingFrameworkUpdateStatus = {
  status: 'fetching';
  version: string;
};

type ResolvedFrameworkUpdateStatus = {
  status: 'update' | 'not_installed' | 'no_update';
  version: string;
};

export type FrameworkUpdateStatus =
  | ErrorFrameworkUpdateStatus
  | IdleFrameworkUpdateStatus
  | FetchingFrameworkUpdateStatus
  | ResolvedFrameworkUpdateStatus;

export const FRAMEWORK_UPDATER_ATOM = atom<UCP3Updater>();

async function fetchFrameworkStatus(): Promise<FrameworkUpdateStatus> {
  LOGGER.msg(`fetchFrameworkStatus`).debug();

  const { version, sha } = getStore().get(UCP_SIMPLIFIED_VERSION_ATOM);

  const updater = new UCP3Updater(version, sha, new Date(0));

  getStore().set(FRAMEWORK_UPDATER_ATOM, updater);

  // Does the actual fetch
  const updateExists = await updater.doesUpdateExist();

  const isInstalled = version !== '0.0.0';

  if (!isInstalled) {
    return { status: 'not_installed', version };
  }

  if (!updateExists) {
    return { status: 'no_update', version };
  }

  setTimeout(() => {
    makeToast({
      title: 'framework.version.update.available.toast.title',
      body: 'framework.version.update.available.toast.body',
      type: ToastType.SUCCESS,
      onClick: () => {
        getStore().set(CURRENT_DISPLAYED_TAB, 'overview');
      },
    });
  }, 3000);

  return { status: 'update', version };
}

// eslint-disable-next-line import/prefer-default-export
export const HAS_UPDATE_QUERY_ATOM = atomWithQuery<FrameworkUpdateStatus>(
  (get) => {
    const { version } = get(UCP_SIMPLIFIED_VERSION_ATOM);
    return {
      queryKey: ['framework', version],
      queryFn: fetchFrameworkStatus,
      retry: false,
      staleTime: 1000 * 60 * 60,
      placeholderData: () => ({ status: 'fetching', version }),
    };
  },
);

export const HAS_UPDATE_ATOM = atom<FrameworkUpdateStatus>((get) => {
  const { version } = get(UCP_SIMPLIFIED_VERSION_ATOM);

  const { isSuccess, isError, error, data } = get(HAS_UPDATE_QUERY_ATOM);
  if (!isSuccess) {
    if (isError) {
      return { status: 'error', message: `${error}` };
    }
    return { status: 'fetching', version };
  }

  return data;
});
