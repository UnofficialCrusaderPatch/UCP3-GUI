import { buildExtensionConfigurationDB } from '../../../components/ucp-tabs/extension-manager/extension-configuration/extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../../../components/ucp-tabs/extension-manager/extensions-state-manipulation';
import { Extension } from '../../../config/ucp/common';
import Logger from '../../../util/scripts/logging';
import Result from '../../../util/structs/result';
import { ExtensionsState } from '../../extensions/extensions-state';

const LOGGER = new Logger('activate-first-time-use-extensions.ts');

// eslint-disable-next-line import/prefer-default-export
export function activateFirstTimeUseExtensions(
  extensionsState: ExtensionsState,
): Result<ExtensionsState, string> {
  const extensionNames = ['ucp2-legacy-defaults', 'graphicsApiReplacer'];

  const unavailable: string[] = [];
  const extensions: Extension[] = [];
  extensionNames.forEach((n) => {
    const options = extensionsState.installedExtensions.filter(
      (ext) => ext.name === n,
    );
    if (options.length > 0) {
      const selection = options
        .sort((a, b) => a.version.localeCompare(b.version))
        .at(0)!;
      extensions.push(selection);
    } else {
      unavailable.push(n);
    }
  });

  if (extensions.length !== 2) {
    const msg = `Not all first time use extensions are available. Unavailable: ${unavailable.join(', ')}`;
    LOGGER.msg(msg).warn();
    return Result.err(msg);
  }

  let newExtensionsState = extensionsState;

  extensions.forEach((ext) => {
    newExtensionsState = addExtensionToExplicityActivatedExtensions(
      newExtensionsState,
      ext,
    );
  });

  const result = buildExtensionConfigurationDB(newExtensionsState);

  return Result.ok(result);
}
