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
import { buildExtensionConfigurationDB } from '../extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../extensions-state-manipulation';
import { ConfigMetaObject } from '../../../../config/ucp/config-merge/objects';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../common/buttons/config-serialized-state';
import reportAndConfirmBuildResult from './reporting';

const LOGGER = new Logger('InactiveExtensionElementClickCallback.tsx');

const inactiveExtensionElementClickCallback = async (ext: Extension) => {
  // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

  LOGGER.msg('inactiveExtensionElementClickCallback').info();

  const currentExtensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  const newExtensionsState = await addExtensionToExplicityActivatedExtensions(
    currentExtensionsState,
    ext,
  );

  const res = buildExtensionConfigurationDB(newExtensionsState);

  if (!(await reportAndConfirmBuildResult(res))) return;

  // TODO: insert logic to integrate existing customisations with the new thing.
  const userConfig = Object.entries(
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
  );

  const newRequiredValues = Object.fromEntries(
    Object.entries(res.configuration.state).filter(
      ([, cmo]: [string, ConfigMetaObject]) =>
        cmo.modifications.value.qualifier === 'required',
    ),
  );

  const lostConfig = userConfig.filter(
    ([url]) => newRequiredValues[url] !== undefined,
  );

  const retainedConfig = Object.fromEntries(
    userConfig.filter(([url]) => newRequiredValues[url] === undefined),
  );

  if (lostConfig.length > 0) {
    const answer = await showModalOkCancel({
      title: 'Losing customisations',
      message: `You will lose ${
        lostConfig.length
      } customisations. Do you want to proceed?\n\nLosing customisations:\n${lostConfig
        .map(([url]) => url)
        .sort()}`,
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

  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: retainedConfig,
  });

  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, res);

  ConsoleLogger.info('New extension state', res);
  ConsoleLogger.info(
    'New full config state',
    getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
  );

  ConsoleLogger.info(
    'New user config state',
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
  );

  getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);
};

export default inactiveExtensionElementClickCallback;
