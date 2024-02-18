import { Extension } from '../../../../config/ucp/common';
import {
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { getStore } from '../../../../hooks/jotai/base';
import { ConsoleLogger } from '../../../../util/scripts/logging';
import { showModalOk } from '../../../modals/modal-ok';
import { EXTENSION_EDITOR_STATE_ATOM } from '../../common/extension-editor/extension-editor-state';
import { constructUserConfigObjects } from '../../common/import-button-callback';
import { buildExtensionConfigurationDB } from '../extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../extensions-state-manipulation';

// eslint-disable-next-line import/prefer-default-export
export const customizeExtensionButtonCallback = async (ext: Extension) => {
  ConsoleLogger.debug('customizeExtensionButtonCallback');

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
      type: 'set-multiple',
      value: newUserConfiguration,
    });
    getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
      type: 'set-multiple',
      value: {},
    });
    getStore().set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
      type: 'set-multiple',
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
};
