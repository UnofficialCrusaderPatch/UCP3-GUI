import { ContentElement } from '../../../../../function/content/types/content-element';
import { createExtensionID } from '../../../../../function/global/constants/extension-id';
import { getStore } from '../../../../../hooks/jotai/base';
import { contentInstallationStatusAtoms } from '../../state/atoms';
import { ContentInstallationStatus } from '../../state/downloads/download-progress';

// eslint-disable-next-line import/prefer-default-export
export function createStatusSetter(contentElement: ContentElement) {
  const id = createExtensionID(contentElement);
  const { name } = contentElement.definition;
  const { version } = contentElement.definition;
  return (status: ContentInstallationStatus) => {
    getStore().set(contentInstallationStatusAtoms(id), {
      name,
      version,
      ...status,
    });
  };
}
