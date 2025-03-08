import { atomWithQuery } from 'jotai-tanstack-query';
import { atom } from 'jotai';
import { ResponseType } from '@tauri-apps/api/http';
import semver from 'semver';
import { GUI_VERSION_ATOM } from '../../footer/footer';
import { fetch } from '../../../tauri/tauri-http';

const guiVersion = atom((get) => {
  const r = get(GUI_VERSION_ATOM);
  if (r.state !== 'hasData') return '0.0.0';

  return r.data;
});

const fetchGUIUpdate = async (): Promise<string> => {
  const result = await fetch<string>(
    'https://gist.githubusercontent.com/ucp3-machine/2a179c892f49448c85dfcc9e5f9a3c6b/raw/',
    {
      method: 'GET',
      responseType: ResponseType.Text,
    },
  );

  if (result.ok) {
    const data = JSON.parse(result.data);

    return data.version;
  }
  return '';
};

const updateCheck = async ({
  queryKey: [, version],
}: {
  queryKey: [string, string];
}): Promise<boolean> => {
  const data = await fetchGUIUpdate();

  const installed = new semver.SemVer(version);
  const remote = new semver.SemVer(data);

  return remote.compare(installed) === 1;
};

// eslint-disable-next-line import/prefer-default-export
export const GUI_UPDATE_CHECK = atomWithQuery((get) => ({
  queryKey: ['gui-update', get(guiVersion)] as [string, string],
  queryFn: updateCheck,
  retry: false,
  staleTime: 1000 * 60 * 60,
}));
