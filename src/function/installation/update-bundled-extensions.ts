import { gt } from 'semver';
import { getVersion } from '@tauri-apps/api/app';
import Logger from '../../util/scripts/logging';
import { installOnlineContent } from '../../components/ucp-tabs/content-manager/buttons/callbacks/install-content';
import { fetchStore } from '../content/store/fetch';
import { discoverExtensions } from '../extensions/discovery/discovery';
import { removeDir, removeFile } from '../../tauri/tauri-files';
import {
  UCP_MODULES_FOLDER,
  UCP_PLUGINS_FOLDER,
} from '../global/constants/file-constants';
import { UCPVersion } from '../ucp-files/ucp-version';
import { planBundledUpdates } from './plan-bundled-updates';
import { validateBundledUpdates } from './validate-bundled-updates';

const LOGGER = new Logger('update-bundled-extensions.ts');

export class BundledUpdateRollbackError extends Error {}

// A module is its ZIP and signature, a plugin its folder
async function removePackage(
  folder: string,
  { name, version, type }: { name: string; version: string; type: string },
) {
  if (type === 'module') {
    const path = `${folder}/${UCP_MODULES_FOLDER}${name}-${version}.zip`;
    (await removeFile(path, true)).getOrThrow();
    (await removeFile(`${path}.sig`, true)).getOrThrow();
  } else {
    (
      await removeDir(
        `${folder}/${UCP_PLUGINS_FOLDER}${name}-${version}`,
        true,
        true,
      )
    ).getOrThrow();
  }
}

export async function updateBundledExtensions(
  folder: string,
  version: UCPVersion,
) {
  const mode =
    version.getBuildRepresentation() === 'Developer' ? 'Developer' : 'Release';
  const bundled = await discoverExtensions(folder, mode);
  const store = await fetchStore({
    queryKey: ['store', version.getMajorMinorPatchAsString()],
  });
  const frontend = await getVersion();
  const framework = version.getMajorMinorPatchAsString();
  const plan = planBundledUpdates(bundled, store, frontend, framework);
  if (plan.length === 0) return;
  const superseded = bundled.filter(
    (old) =>
      /^[a-zA-Z0-9_-]+$/.test(old.name) &&
      plan.some(
        ({ definition: next }) =>
          next.name === old.name &&
          next.type === old.type &&
          gt(next.version, old.version),
      ),
  );
  try {
    const results = await installOnlineContent(plan, undefined, folder);
    if (results.some((r) => r.status === 'error')) {
      throw new Error('Could not install all bundled extension updates');
    }
    const installed = await discoverExtensions(folder, mode);
    const candidates = installed.filter(
      (e) =>
        !superseded.some(
          (old) =>
            old.name === e.name &&
            old.version === e.version &&
            old.type === e.type,
        ),
    );
    validateBundledUpdates(bundled, candidates, plan, frontend, framework);
  } catch (error) {
    // These exact versions were absent before this operation. Preserve every
    // bundled version so failed/partial downloads fall back to the original set.
    try {
      await Promise.all(
        plan.map(({ definition: d }) => removePackage(folder, d)),
      );
    } catch (rollbackError) {
      throw new BundledUpdateRollbackError(
        `Could not restore bundled extensions: ${rollbackError}`,
      );
    }
    throw error;
  }

  // Only prune the original bundle after the entire resolved update succeeded.
  // Never roll back new packages once deletion of old packages has begun.
  await Promise.all(
    superseded.map(async (old) => {
      try {
        await removePackage(folder, old);
      } catch (error) {
        LOGGER.msg(
          `Updated ${old.name}, but could not remove bundled ${old.version}: ${error}`,
        ).warn();
      }
    }),
  );
}
