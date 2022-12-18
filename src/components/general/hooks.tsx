import { getGameFolderPath } from 'tauri/tauri-files';
import { useSearchParamsCustom } from 'util/scripts/hooks';

// eslint-disable-next-line import/prefer-default-export
export function useCurrentGameFolder(): string {
  const [searchParams] = useSearchParamsCustom();
  return getGameFolderPath(searchParams);
}
