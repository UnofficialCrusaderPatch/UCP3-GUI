import { rcompare } from 'semver';
import { getVersion } from '@tauri-apps/api/app';
import { exists } from '@tauri-apps/api/fs';
import { buildExtensionConfigurationDB } from '../../configuration/extension-configuration/build-extension-configuration-db';
import { addExtensionToExplicityActivatedExtensions } from '../../../components/ucp-tabs/extension-manager/extensions-state-manipulation';
import { Extension } from '../../../config/ucp/common';
import {
  loadConfigFromFile,
  serializeUCPConfig,
  toYaml,
} from '../../../config/ucp/config-files/config-files';
import { writeTextFile } from '../../../tauri/tauri-files';
import {
  constructUserConfigObjects,
  prepareUcpConfigImport,
  solveImportedState,
} from '../../../components/ucp-tabs/common/importing/import-button-callback';
import { availableExtensionVersions } from '../../extensions/state/state';
import Logger from '../../../util/scripts/logging';
import Result from '../../../util/structs/result';
import { ExtensionsState } from '../../extensions/extensions-state';
import { createBasicExtensionsState } from '../../extensions/state/init';
import { discoverExtensions } from '../../extensions/discovery/discovery';
import { UCP_CONFIG_YML } from '../../global/constants/file-constants';
import { UCPVersionFileProcessResult } from '../../ucp-files/ucp-version';
import { FIRST_TIME_USE_SETUP } from '../constants';

const LOGGER = new Logger('activate-first-time-use-extensions.ts');

function highestInstalled(extensionsState: ExtensionsState, name: string) {
  return extensionsState.installedExtensions
    .filter((ext) => ext.name === name)
    .sort((a, b) => rcompare(a.version, b.version))
    .at(0);
}

/**
 * Explicitly activates only the newest installed default setup; dependency
 * resolution activates what it needs.
 *
 * @returns the new state, or undefined if the setup is not installed
 * @throws if the setup cannot be activated or its configuration has errors
 */
export function activateFirstTimeUseSetup(extensionsState: ExtensionsState) {
  const setup = highestInstalled(extensionsState, FIRST_TIME_USE_SETUP);
  if (setup === undefined) return undefined;
  const state = buildExtensionConfigurationDB(
    addExtensionToExplicityActivatedExtensions(extensionsState, setup),
  );
  if (state.configuration.errors.length > 0) {
    throw new Error(
      `Configuration errors: ${state.configuration.errors.join(', ')}`,
    );
  }
  return state;
}

export function activateFirstTimeUseExtensions(
  extensionsState: ExtensionsState,
): Result<ExtensionsState, string> {
  try {
    const setupState = activateFirstTimeUseSetup(extensionsState);
    if (setupState !== undefined) return Result.ok(setupState);
  } catch (err: unknown) {
    LOGGER.msg(
      `Could not activate ${FIRST_TIME_USE_SETUP}, using the bundled defaults: ${err}`,
    ).warn();
  }

  const extensionNames = ['ucp2-legacy-defaults', 'graphicsApiReplacer'];

  const unavailable: string[] = [];
  const extensions: Extension[] = [];
  extensionNames.forEach((n) => {
    const selection = highestInstalled(extensionsState, n);
    if (selection !== undefined) {
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

// A scratch extension state of a folder's own extensions, as a load builds it
async function folderState(
  folder: string,
  versionResult: UCPVersionFileProcessResult,
) {
  if (versionResult.status !== 'ok') {
    throw new Error('the framework version file could not be read');
  }
  const { version } = versionResult;
  const mode =
    version.getBuildRepresentation() === 'Developer' ? 'Developer' : 'Release';
  return createBasicExtensionsState(
    await discoverExtensions(folder, mode),
    await getVersion(),
    version.isValidForSemanticVersioning
      ? version.getMajorMinorPatchAsString()
      : undefined,
  );
}

/**
 * The YAML of a first configuration with this state: the same file as saving
 * right after first use, with no user values yet.
 *
 * @throws if the state cannot be serialized
 */
export function serializeFirstTimeUseState(state: ExtensionsState) {
  return toYaml(
    serializeUCPConfig(
      {},
      { ...state.configuration.defined },
      [...state.explicitlyActivatedExtensions].reverse(),
      [...state.activeExtensions].reverse(),
      {},
    ),
  );
}

/**
 * The YAML the installer saves as the first configuration: the default setup
 * if it is installed, otherwise the previous pair.
 *
 * @throws if neither gives a profile without configuration errors, or it
 * cannot be serialized
 */
export function firstTimeUseConfiguration(extensionsState: ExtensionsState) {
  const activated = activateFirstTimeUseExtensions(extensionsState);
  if (activated.isErr()) throw new Error(activated.err().getOrElse(''));
  const state = activated.getOrThrow();
  if (state.configuration.errors.length > 0) {
    throw new Error(
      `Configuration errors: ${state.configuration.errors.join(', ')}`,
    );
  }
  return serializeFirstTimeUseState(state);
}

// The import that the next load of the folder performs, read-only on a
// scratch state: the real loader and the import's own preparation, user
// settings included
async function checkProfileLoads(
  file: string,
  extensionsState: ExtensionsState,
) {
  const loaded = await loadConfigFromFile(file);
  if (loaded.status !== 'OK') {
    throw new Error(`${file} cannot be loaded: ${loaded.message}`);
  }
  let prepared: ReturnType<typeof prepareUcpConfigImport>;
  try {
    prepared = prepareUcpConfigImport(
      loaded.result,
      () => {},
      extensionsState,
      {
        availableVersions: availableExtensionVersions(extensionsState),
      },
    );
    constructUserConfigObjects(loaded.result);
  } catch (error) {
    throw new Error(`${file} cannot be loaded: ${error}`);
  }
  if (prepared.status !== 'ok') {
    throw new Error(`${file} cannot be loaded: ${prepared.result.message}`);
  }
  const solution = solveImportedState(prepared.newExtensionsState);
  if (solution.status !== 'OK') {
    throw new Error(`${file} cannot be loaded: ${solution.message}`);
  }
}

/**
 * Writes the first configuration of a freshly installed folder from its own
 * extensions, leaving the loaded GUI state alone. Never replaces a profile: one
 * that came with the archive or appears during the installation is kept, and
 * must load like the next load of the folder will import it.
 *
 * @throws if the folder ends without a profile that loads
 */
export async function saveFirstTimeUseConfiguration(
  folder: string,
  versionResult: UCPVersionFileProcessResult,
) {
  const file = `${folder}/${UCP_CONFIG_YML}`;
  const extensionsState = await folderState(folder, versionResult);
  if (!(await exists(file))) {
    let text: string | undefined;
    try {
      text = firstTimeUseConfiguration(extensionsState);
    } catch (error) {
      if (!(await exists(file))) throw error;
    }
    // Create only: checked again right before writing
    if (text !== undefined && !(await exists(file))) {
      (await writeTextFile(file, text)).throwIfErr();
      return;
    }
  }
  LOGGER.msg(`Keeping ${file}, which was not written by the installer`).info();
  await checkProfileLoads(file, extensionsState);
}
