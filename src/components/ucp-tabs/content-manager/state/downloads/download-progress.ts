import { atom } from 'jotai';

export type DownloadProgress = {
  name: string;
  version: string;
  pending: boolean;
  error: boolean;
  progress: number;
};

export type DownloadProgressDatabase = {
  [key: string]: DownloadProgress;
};

export const DOWNLOAD_PROGRESS_ATOM = atom<DownloadProgressDatabase>({});
