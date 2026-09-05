import { getVersion } from '@tauri-apps/api/app';
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
}
