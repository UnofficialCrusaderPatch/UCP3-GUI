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

export const FRAMEWORK_UPDATER_ATOM = atom<UCP3Updater>((get) => {
  const { version, sha } = get(UCP_SIMPLIFIED_VERSION_ATOM);
  return UCP3Updater.DUMMY.setVersionInfo(version, sha, new Date(0));
});

async function fetchFrameworkStatus(): Promise<FrameworkUpdateStatus> {
  const { version, sha } = getStore().get(UCP_SIMPLIFIED_VERSION_ATOM);

  const isInstalled = version !== '0.0.0';

  if (!isInstalled) {
    LOGGER.msg(`fetch: fetching...`).debug();
    return { status: 'not_installed', version };
  }

  LOGGER.msg(`fetch: fetching for ${version}-${sha}`).debug();

  const updater = getStore().get(FRAMEWORK_UPDATER_ATOM);

  // Does the actual fetch
  LOGGER.msg(`fetch: fetching...`).debug();
  const updateExists = await updater.doesUpdateExist();

  if (!updateExists) {
    LOGGER.msg(`fetch: fetching... no update`).debug();
    return { status: 'no_update', version };
  }

  LOGGER.msg(`fetch: fetching... update!`).debug();

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
    const { version, sha } = get(UCP_SIMPLIFIED_VERSION_ATOM);
    return {
      queryKey: ['framework', version, sha],
      queryFn: fetchFrameworkStatus,
      retry: false,
      staleTime: 1000 * 60 * 60,
      placeholderData: () => ({ status: 'fetching', version }),
    };
  },
);

export const HAS_UPDATE_ATOM = atom<FrameworkUpdateStatus>((get) => {
  const { version } = get(UCP_SIMPLIFIED_VERSION_ATOM);

  LOGGER.msg(`has-update-atom: version: ${version}`).debug();

  const { isSuccess, isError, error, data } = get(HAS_UPDATE_QUERY_ATOM);

  if (!isSuccess) {
    if (isError) {
      LOGGER.msg(`has-update-atom: error: ${error}`).debug();
      return { status: 'error', message: `${error}` };
    }
    LOGGER.msg(`has-update-atom: fetching for: ${version}`).debug();
    return { status: 'fetching', version };
  }

  LOGGER.msg(`has-update-atom: data: ${JSON.stringify(data)}`).debug();

  return data;
});
