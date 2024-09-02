import { ContentElement } from '../../../../function/content/types/content-element';

type BaseContentMutationResult = {
  contentElement: ContentElement;
  type: 'download_and_install' | 'uninstall';
};
export type OkayContentMutationResult = BaseContentMutationResult & {
  status: 'ok';
};
export type ErrorContentMutationResult = BaseContentMutationResult & {
  status: 'error';
  message: string;
};
export type DownloadAndInstallContentResult =
  | OkayContentMutationResult
  | ErrorContentMutationResult;
