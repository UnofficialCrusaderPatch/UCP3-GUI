import { getVersion } from '@tauri-apps/api/app';
import { showModalOk } from '../../../components/modals/modal-ok';
import { Extension } from '../../../config/ucp/common';
import { getStore } from '../../../hooks/jotai/base';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { UCP_CONFIG_FILE_ATOM } from '../../configuration/state';
import { discoverExtensions } from '../../extensions/discovery/discovery';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../extensions/state/state';
import { UCP_VERSION_ATOM } from '../../ucp-files/ucp-version';
import { INIT_DONE, INIT_ERROR, INIT_RUNNING } from './initialization-states';
import { LOGGER } from '../logger';
import { UCP_CONFIG_YML } from '../../global/constants/file-constants';
import {
  setExtensionsStateAndClearConfiguration,
  createBasicExtensionsState,
} from '../../extensions/state/init';
import { setupExtensionsStateConfiguration } from './load-extensions-state';

/**
 * Initialize the game folder
 *
 * @param folder The (new) game folder
 * @param mode Release or Developer
 * @returns void
 */
// eslint-disable-next-line import/prefer-default-export
export async function initializeGameFolder(
  folder: string,
  mode?: 'Release' | 'Developer',
) {
  if (folder.length === 0) {
    LOGGER.msg('No folder active.').info();
    return;
  }

  getStore().set(INIT_RUNNING, true);
  getStore().set(INIT_DONE, false);
  getStore().set(INIT_ERROR, false);

  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  let extensions: Extension[] = [];
  let file = '';

  LOGGER.msg(`Current folder: ${folder}`).info();

  try {
    extensions = await discoverExtensions(folder, mode);
  } catch (e) {
    LOGGER.obj(e).error();
    showModalOk({
      message: (e as object).toString(),
      title: 'Error in extension discovery and loading',
    });

    getStore().set(INIT_ERROR, true);
  }

  LOGGER.msg('Finished extension discovery').info();
  ConsoleLogger.debug('Discovered extensions: ', extensions);
  ConsoleLogger.debug('pre extensionsState: ', extensionsState);

  file = `${folder}/${UCP_CONFIG_YML}`;

  getStore().set(UCP_CONFIG_FILE_ATOM, file);

  const frontendVersion = await getVersion();
  const frameworkVersion = getStore().get(UCP_VERSION_ATOM).version
    .isValidForSemanticVersioning
    ? getStore().get(UCP_VERSION_ATOM).version.getMajorMinorPatchAsString()
    : undefined;

  const inactiveExtensionsState = createBasicExtensionsState(
    extensions,
    frontendVersion,
    frameworkVersion,
  );

  ConsoleLogger.debug(`Basic extensions state: `, inactiveExtensionsState);

  const is = inactiveExtensionsState.tree.tryResolveAllDependencies();
  if (is.status !== 'ok') {
    ConsoleLogger.warn(
      `Not all dependencies for all extensions could be resolved:\n${is.messages.join('\n')}`,
    );
  }

  LOGGER.msg('Setting new extensions state').info();

  const noInitErrors = getStore().get(INIT_ERROR) === false;
  if (noInitErrors) {
    const setupResult = await setupExtensionsStateConfiguration(
      inactiveExtensionsState,
      folder,
      file,
    );

    if (setupResult.isErr()) {
      showModalOk({
        title: 'config.load.fail.title',
        message: {
          key: 'config.load.fail.message',
          args: {
            err: setupResult.err().getOrElse('unknown error'),
          },
        },
      });
    }
  } else {
    LOGGER.msg(
      `Not loading ${UCP_CONFIG_YML} as there were errors during init`,
    ).warn();
    setExtensionsStateAndClearConfiguration(inactiveExtensionsState);

    showModalOk({
      title: 'config.load.skip.title',
      message: {
        key: 'config.load.skip.message',
      },
    });
  }

  getStore().set(INIT_DONE, true);
  getStore().set(INIT_RUNNING, false);

  LOGGER.msg('finished').info();
} // normal atoms
