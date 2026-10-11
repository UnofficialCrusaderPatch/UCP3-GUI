import { ExtensionsState } from 'function/extensions/extensions-state';
import equal from 'deep-equal';
import {
  EXTENSION_STATE_INTERFACE_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../function/extensions/state/state';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { Extension } from '../../../../config/ucp/common';
import { getStore } from '../../../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import Logger, { ConsoleLogger } from '../../../../util/scripts/logging';
import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { selectExtensionFamilyMember } from '../extensions-state-manipulation';
import { FamilyConflictError } from '../../../../function/extensions/dependency-management/families';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../common/buttons/config-serialized-state';
import reportAndConfirmBuildResult from './reporting';
import { showModalOk } from '../../../modals/modal-ok';
import { createExtensionID } from '../../../../function/global/constants/extension-id';

const LOGGER = new Logger('inactive-extension-element-click-callback.tsx');

function computeMaskedPreferences(
  state: ExtensionsState,
  previous: ExtensionsState,
) {
  const userConfig = Object.entries(
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
  );

  return userConfig.filter(([url, value]) => {
    const lock = state.configuration.locks[url];
    return (
      lock !== undefined &&
      !equal(value, lock.lockedValue, { strict: true }) &&
      !equal(previous.configuration.locks[url]?.lockedValue, lock.lockedValue, {
        strict: true,
      })
    );
  });
}

async function inactiveExtensionElementClickCallback(ext: Extension) {
  // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

  LOGGER.msg(
    `inactiveExtensionElementClickCallback(${createExtensionID(ext)})`,
  ).info();

  const currentExtensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  let newExtensionsState = { ...currentExtensionsState };

  try {
    newExtensionsState = selectExtensionFamilyMember(
      currentExtensionsState,
      ext,
    );
  } catch (err: any) {
    await showModalOk({
      title:
        err instanceof FamilyConflictError
          ? 'discovery.family.conflict.title'
          : 'extensions.activation.dependency.conflicts.error.title',
      message: {
        key:
          err instanceof FamilyConflictError
            ? 'discovery.family.conflict.message'
            : 'extensions.activation.dependency.conflicts.error.message',
        args: {
          log: err.toString(),
          details: err instanceof FamilyConflictError ? err.details : '',
        },
      },
    });

    return;
  }

  const res = buildExtensionConfigurationDB(newExtensionsState);

  if (!(await reportAndConfirmBuildResult(res))) return;

  const maskedConfig = computeMaskedPreferences(res, currentExtensionsState);

  if (maskedConfig.length > 0) {
    const answer = await showModalOkCancel({
      title: 'discovery.preferences.masked.title',
      message: {
        key: 'discovery.preferences.masked.message',
        args: {
          n: maskedConfig.length,
          entries: maskedConfig
            .map(([url]) => url)
            .sort()
            .join('\n'),
        },
      },
    });

    if (!answer) {
      return;
    }
  }

  ConsoleLogger.info(
    'Current full config state',
    getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
  );

  ConsoleLogger.info(
    'Current user config state',
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
  );

  if (getStore().get(EXTENSION_STATE_REDUCER_ATOM) !== currentExtensionsState)
    return;

  ConsoleLogger.info(
    'New user config state',
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
  );

  ConsoleLogger.info('New extension state', res);

  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, res);
  getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);
}

export default inactiveExtensionElementClickCallback;
export { computeMaskedPreferences };
