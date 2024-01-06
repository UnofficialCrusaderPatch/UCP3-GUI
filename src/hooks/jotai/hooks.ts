/* eslint-disable import/prefer-default-export */
import { RecentFolderHelper } from '../../config/gui/recent-folder-helper';
import { createFunctionForAsyncAtomWithMutate } from './base';

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
