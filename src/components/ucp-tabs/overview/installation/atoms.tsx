import { atomWithQuery } from 'jotai-tanstack-query';
import { atom } from 'jotai';
import {
  UCP3ReleaseMeta,
  UCP3Updater,
} from '../../../../function/download/github';
import { UCP_SIMPLIFIED_VERSION_ATOM } from '../../../../function/ucp-files/ucp-version';
import { getStore } from '../../../../hooks/jotai/base';
import { makeToast, ToastType } from '../../../toasts/toasts-display';
import { CURRENT_DISPLAYED_TAB } from '../../tabs-state';
import Logger from '../../../../util/scripts/logging';

const LOGGER = new Logger('framework-updater-atom.ts');

export const FRAMEWORK_UPDATER_ATOM = atom<UCP3Updater>((get) => {
  const v = get(UCP_SIMPLIFIED_VERSION_ATOM);

  if (v.version !== '0.0.0') {
    const { version, sha } = v;
    return new UCP3Updater(version, sha, new Date(0));
  }

  // Fallback
  return UCP3Updater.DUMMY;
});

export type FrameworkUpdateStatus = {
  status: 'update' | 'not_installed' | 'no_update' | 'installed' | 'fetching';
  version: string;
};

export const HAS_UPDATE_OVERRIDE_ATOM = atom<FrameworkUpdateStatus>({
  status: 'not_installed',
  version: '',
});

async function fetchFrameworkStatus() {
  LOGGER.msg(`fetchFrameworkStatus`).debug();

  const updater = getStore().get(FRAMEWORK_UPDATER_ATOM);

  const meta = await updater.fetchMeta();
  return meta;
}

// eslint-disable-next-line import/prefer-default-export
export const HAS_UPDATE_QUERY_ATOM = atomWithQuery<UCP3ReleaseMeta>((get) => ({
  queryKey: ['framework', get(FRAMEWORK_UPDATER_ATOM).version],
  queryFn: fetchFrameworkStatus,
  retry: false,
  staleTime: 1000 * 60 * 60,
  placeholderData: () => undefined,
}));

export const HAS_UPDATE_ATOM = atom(async (get) => {
  const { version } = getStore().get(UCP_SIMPLIFIED_VERSION_ATOM);

  const { isSuccess } = get(HAS_UPDATE_QUERY_ATOM);
  if (!isSuccess) {
    return { status: 'fetching', version } as FrameworkUpdateStatus;
  }
  const updater = get(FRAMEWORK_UPDATER_ATOM);

  const updateExists = await updater.doesUpdateExist();

  const isInstalled = version !== '0.0.0';

  let result = { status: 'not_installed', version };

  if (isInstalled && updateExists) {
    result = { status: 'update', version };
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
  } else if (isInstalled && !updateExists) {
    result = { status: 'no_update', version };
  } else if (!isInstalled) {
    result = { status: 'not_installed', version };
  } else if (isInstalled) {
    result = { status: 'installed', version };
  }

  return result as FrameworkUpdateStatus;
});
