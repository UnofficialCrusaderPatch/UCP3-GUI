import { expect, it, vi } from 'vitest';
import { ExtensionHandle } from '../../extensions/handles/extension-handle';
import installedCapabilities from './installed-metadata';

it('finds ZIP resources without explicit directory entries', async () => {
  const handle = {
    doesEntryExist: vi.fn(async () => false),
    listEntries: vi.fn(async () => [{ path: 'resources/ai/castle.aiv' }]),
  } as unknown as ExtensionHandle;
  expect(await installedCapabilities(handle, false, false)).toEqual({
    files: true,
    code: false,
    configuration: false,
    options: false,
  });
});

it('retains unknown facts on I/O failure without rejecting discovery', async () => {
  const handle = {
    doesEntryExist: vi.fn(async () => {
      throw new Error('unreadable');
    }),
  } as unknown as ExtensionHandle;
  expect(await installedCapabilities(handle, true, true)).toEqual({
    files: undefined,
    code: undefined,
    configuration: true,
    options: true,
  });
});
