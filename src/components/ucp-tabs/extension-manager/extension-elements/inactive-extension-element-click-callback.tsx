import {
  EXTENSION_STATE_INTERFACE_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../function/extensions/state/state';
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
import { confirmRequiredValueRepairs } from '../../common/required-value-repairs-dialog';
import { saveStateChanges } from '../../../../function/extensions/save-state';
import { confirmSaveStateLoss } from '../../common/save-state-loss-dialog';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../common/buttons/config-serialized-state';
import reportAndConfirmBuildResult from './reporting';
import { showModalOk } from '../../../modals/modal-ok';
import { createExtensionID } from '../../../../function/global/constants/extension-id';

const LOGGER = new Logger('inactive-extension-element-click-callback.tsx');

async function inactiveExtensionElementClickCallback(ext: Extension) {
  // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

  LOGGER.msg(
    `inactiveExtensionElementClickCallback(${createExtensionID(ext)})`,
  ).info();

  const currentExtensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  let newExtensionsState = { ...currentExtensionsState };

  try {
    // Resolves on copied trees: a cancelled confirmation leaves the live graph unchanged.
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

  // Family members must not differ in save-state modules. A switch that still
  // removes one asks first; one that adds one breaks the rule and is logged.
  const saveState = saveStateChanges(
    currentExtensionsState.activeExtensions,
    res.activeExtensions,
  );
  const replacedChoice =
    currentExtensionsState.explicitlyActivatedExtensions.some(
      (previous) =>
        !res.explicitlyActivatedExtensions.some(
          (e) => e.name === previous.name,
        ),
    );
  if (replacedChoice && (saveState.added.length || saveState.removed.length))
    LOGGER.msg(
      `Switching to ${createExtensionID(ext)} changes save-state modules: ` +
        `adds ${saveState.added.map(createExtensionID).join(', ')}, ` +
        `removes ${saveState.removed.map(createExtensionID).join(', ')}. ` +
        'Family members should bring in the same save-state modules.',
    ).warn();
  if (!(await confirmSaveStateLoss(saveState.removed))) return;

  if (!(await confirmRequiredValueRepairs(res))) return;

  ConsoleLogger.info(
    'Current full config state',
    getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
  );

  ConsoleLogger.info(
    'Current user config state',
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
  );

  // A dialog was open; never apply a candidate computed from an older state.
  if (getStore().get(EXTENSION_STATE_REDUCER_ATOM) !== currentExtensionsState)
    return;

  ConsoleLogger.info('New extension state', res);

  // Stores confirmed required values in place of conflicting preferences.
  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, res);
  getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);

  ConsoleLogger.info(
    'New user config state',
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
  );
}

export default inactiveExtensionElementClickCallback;
