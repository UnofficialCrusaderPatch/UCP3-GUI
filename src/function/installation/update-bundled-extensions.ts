import { gt } from 'semver';
import { getVersion } from '@tauri-apps/api/app';
import Logger from '../../util/scripts/logging';
import { installOnlineContent } from '../../components/ucp-tabs/content-manager/buttons/callbacks/install-content';
import { fetchStore } from '../content/store/fetch';
import { discoverExtensions } from '../extensions/discovery/discovery';
import { removeDir, removeFile } from '../../tauri/tauri-files';
import { UCPVersion } from '../ucp-files/ucp-version';
import { planBundledUpdates } from './plan-bundled-updates';

export class BundledUpdateRollbackError extends Error {}

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
  const plan = planBundledUpdates(
    bundled,
    store,
    await getVersion(),
    version.getMajorMinorPatchAsString(),
  );
  if (plan.length === 0) return;
  try {
    const results = await installOnlineContent(plan, undefined, folder);
    if (results.some((r) => r.status === 'error')) {
      throw new Error('Could not install all bundled extension updates');
    }
  } catch (error) {
    // These exact versions were absent before this operation. Preserve every
    // bundled version so failed/partial downloads fall back to the original set.
    try {
      await Promise.all(
        plan.map(async ({ definition: d }) => {
          if (d.type === 'module') {
            const path = `${folder}/ucp/modules/${d.name}-${d.version}.zip`;
            (await removeFile(path, true)).getOrThrow();
            (await removeFile(`${path}.sig`, true)).getOrThrow();
          } else {
            (
              await removeDir(
                `${folder}/ucp/plugins/${d.name}-${d.version}`,
                true,
                true,
              )
            ).getOrThrow();
          }
        }),
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
  await Promise.all(
    superseded.map(async (old) => {
      try {
        if (old.type === 'module') {
          const path = `${folder}/ucp/modules/${old.name}-${old.version}.zip`;
          (await removeFile(path, true)).getOrThrow();
          (await removeFile(`${path}.sig`, true)).getOrThrow();
        } else {
          (
            await removeDir(
              `${folder}/ucp/plugins/${old.name}-${old.version}`,
              true,
              true,
            )
          ).getOrThrow();
        }
      } catch (error) {
        new Logger('update-bundled-extensions.ts')
          .msg(
            `Updated ${old.name}, but could not remove bundled ${old.version}: ${error}`,
          )
          .warn();
      }
    }),
  );
}
