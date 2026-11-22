import { createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getStore } from '../../../hooks/jotai/base';
import { saveUCPConfig } from '../../../config/ucp/config-files/config-files';
import { UCP_CONFIG_FILE_ATOM } from '../../../function/configuration/state';
import { PROFILE_NOT_LOADED_ATOM, saveBeforeLaunch } from './save-config';

vi.mock('../../../hooks/jotai/base', async (original) => ({
  ...(await original<typeof import('../../../hooks/jotai/base')>()),
  getStore: vi.fn(),
}));
vi.mock('../../../config/ucp/config-files/config-files', async (original) => ({
  ...(await original<object>()),
  saveUCPConfig: vi.fn(async () => 'saved'),
}));

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  vi.mocked(saveUCPConfig).mockClear();
  getStore().set(UCP_CONFIG_FILE_ATOM, 'C:/game/ucp-config.yml');
});

describe('Save before launch', () => {
  test('leaves a profile that was not loaded alone', async () => {
    getStore().set(PROFILE_NOT_LOADED_ATOM, true);
    expect(await saveBeforeLaunch()).toBe('skipped');
    expect(saveUCPConfig).not.toHaveBeenCalled();
  });

  test('saves a loaded profile as before', async () => {
    expect(await saveBeforeLaunch()).toBe('saved');
    expect(saveUCPConfig).toHaveBeenCalledTimes(1);
    expect(getStore().get(PROFILE_NOT_LOADED_ATOM)).toBe(false);
  });
});
