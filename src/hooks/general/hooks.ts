import { getGameFolderPath } from 'tauri/tauri-files';
import { useSearchParamsCustom } from 'hooks/general/util';

// eslint-disable-next-line import/prefer-default-export
export function useCurrentGameFolder(): string {
  const [searchParams] = useSearchParamsCustom();
  return getGameFolderPath(searchParams);
}
