import { ExtensionHandle } from '../../extensions/handles/extension-handle';
import { DiscoveryMetadata } from './metadata';

// Presentation facts must never make an otherwise valid package unloadable.
// ZIPs need not contain explicit directory entries, so inspect descendants too.
export default async function installedCapabilities(
  handle: ExtensionHandle,
  configuration: boolean,
  options: boolean,
): Promise<DiscoveryMetadata['capabilities']> {
  const fact = async (read: () => Promise<boolean>) => {
    try {
      return await read();
    } catch {
      return undefined;
    }
  };
  const [files, code] = await Promise.all([
    fact(
      async () =>
        (await handle.doesEntryExist('resources/')) ||
        (await handle.listEntries('resources', '**/*')).length > 0,
    ),
    fact(() => handle.doesEntryExist('init.lua')),
  ]);
  return { files, code, configuration, options };
}
