import { useSearchParams } from 'react-router-dom';
import { getGameFolderPath } from 'tauri/tauri-files';

// eslint-disable-next-line import/prefer-default-export
export function useCurrentGameFolder(): string {
  const [searchParams] = useSearchParams();
  return getGameFolderPath(searchParams);
}
