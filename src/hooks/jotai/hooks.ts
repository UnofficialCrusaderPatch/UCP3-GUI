import { RecentFolderHelper } from 'config/gui/recent-folder-helper';
import {
  getEmptyUCPVersion,
  loadUCPVersion,
} from 'function/ucp-files/ucp-version';
import {
  createFunctionForAsyncAtomWithMutate,
  createHookInitializedFunctionForAsyncAtomWithMutate,
} from 'hooks/jotai/base';

export const useRecentFolders = createFunctionForAsyncAtomWithMutate<
  RecentFolderHelper,
  []
>(async () => {
  const recentFolderHelper = new RecentFolderHelper();
  // the folders will only be loaded once, so multiple landing pages will not work
  // since the object here needs to copy the backend behavior and will not query again
  await recentFolderHelper.loadRecentFolders();
  return recentFolderHelper;
});

export const useUCPVersionHook =
  createHookInitializedFunctionForAsyncAtomWithMutate(
    async (_prev, currentFolder: string) =>
      (await loadUCPVersion(currentFolder))
        .ok()
        .getOrReceive(getEmptyUCPVersion),
  );
