import { buildExtensionConfigurationDB } from '../../../components/ucp-tabs/extension-manager/extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../../../components/ucp-tabs/extension-manager/extensions-state-manipulation';
import { Extension } from '../../../config/ucp/common';
import { ExtensionsState } from '../../extensions/extensions-state';

// eslint-disable-next-line import/prefer-default-export
export function activateFirstTimeUseExtensions(
  extensionsState: ExtensionsState,
) {
  const extensionNames = ['ucp2-legacy-defaults', 'graphicsApiReplacer'];

  const extensions: Extension[] = [];
  extensionNames.forEach((n) => {
    const options = extensionsState.extensions.filter((ext) => ext.name === n);
    if (options.length > 0) {
      extensions.push(
        options.sort((a, b) => a.version.localeCompare(b.version)).at(0)!,
      );
    }
  });

  let newExtensionsState = extensionsState;

  extensions.forEach((ext) => {
    newExtensionsState = addExtensionToExplicityActivatedExtensions(
      newExtensionsState,
      ext,
    );
  });

  return buildExtensionConfigurationDB(newExtensionsState);
}
