import { Extension } from '../../../../config/ucp/common';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
} from '../../../../function/configuration/state';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import {
  EXTENSION_STATE_INTERFACE_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../function/extensions/state/state';
import { getStore } from '../../../../hooks/jotai/base';
import { ConsoleLogger } from '../../../../util/scripts/logging';
import { showModalOk } from '../../../modals/modal-ok';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { makeToast } from '../../../toasts/toasts-display';
import { CONFIG_DIRTY_STATE_ATOM } from '../../common/buttons/config-serialized-state';
import { EXTENSION_EDITOR_STATE_ATOM } from '../../common/extension-editor/extension-editor-state';
import { constructUserConfigObjects } from '../../common/importing/import-button-callback';
import saveConfig from '../../common/save-config';
import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../extensions-state-manipulation';

// eslint-disable-next-line import/prefer-default-export
export async function customizeExtensionButtonCallback(ext: Extension) {
  ConsoleLogger.debug('customizeExtensionButtonCallback');

  if (getStore().get(CONFIG_DIRTY_STATE_ATOM)) {
    const answer = await showModalOkCancel({
      title: 'extensions.extension.customisations.saveCurrent.title',
      message: 'extensions.extension.customisations.saveCurrent.message',
      cancel: 'no',
      ok: 'yes',
    });

    if (answer) {
      const result: string = await saveConfig(
        getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
        getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
        getStore().get(UCP_CONFIG_FILE_ATOM), // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`,
        getStore().get(EXTENSION_STATE_REDUCER_ATOM)
          .explicitlyActivatedExtensions,
        getStore().get(EXTENSION_STATE_REDUCER_ATOM).activeExtensions,
        getStore().get(CONFIGURATION_QUALIFIER_REDUCER_ATOM),
      );

      makeToast({
        title: result,
        body: result,
      });
    }
  }

  const oldExtensionsState = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);

  const {
    activeExtensions: oldActiveExtensions,
    configuration: oldConfiguration,
    explicitlyActivatedExtensions: oldExplicitlyActiveExtensions,
    ...remainderExtensionsState
  } = oldExtensionsState;

  const emptiedExtensionsState = {
    ...remainderExtensionsState,
    activeExtensions: new Array<Extension>(),
    explicitlyActivatedExtensions: new Array<Extension>(),
  };

  try {
    const extensionCompleteState = addExtensionToExplicityActivatedExtensions(
      emptiedExtensionsState as unknown as ExtensionsState,
      ext,
    );

    const eae = extensionCompleteState.activeExtensions
      .filter((e) => e.name !== ext.name)
      .filter((e) => ext.definition.dependencies[e.name] !== undefined);

    const ae = [
      ...eae,
      ...extensionCompleteState.activeExtensions
        .filter((e) => e.name !== ext.name)
        .filter((e) => ext.definition.dependencies[e.name] === undefined),
    ];

    const stateWithoutTargetExtension = {
      ...extensionCompleteState,
      explicitlyActivatedExtensions: eae,
      activeExtensions: ae,
    };

    const stateIncludingNewConfig = buildExtensionConfigurationDB(
      stateWithoutTargetExtension,
    );

    const ucos = constructUserConfigObjects(ext.config);
    const newUserConfiguration = ucos.userConfig;
    const newConfigurationQualifier = ucos.userConfigQualifiers;

    ConsoleLogger.debug(
      'customize-extension-button-callback.tsx: new "user" configuration',
      newUserConfiguration,
    );

    getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'reset',
      value: newUserConfiguration,
    });
    getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
      type: 'reset',
      value: {},
    });
    getStore().set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
      type: 'reset',
      value: newConfigurationQualifier,
    });

    getStore().set(EXTENSION_EDITOR_STATE_ATOM, {
      extension: ext,
      state: 'active',
    });

    ConsoleLogger.debug(
      'customize-extension-button-callback.tsx: new extension state',
      stateIncludingNewConfig,
    );
    // Set the new extension state, which fires an update of the full config
    getStore().set(EXTENSION_STATE_INTERFACE_ATOM, stateIncludingNewConfig);
  } catch (err: any) {
    await showModalOk({
      title: 'error',
      message: `Cannot customize ${ext.name} because:\n${err.toString()}`,
    });
  }
}
