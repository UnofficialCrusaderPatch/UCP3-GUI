// eslint-disable-next-line import/prefer-default-export
export function testingMockIPC(): (
  cmd: string,
  args: Record<string, unknown>,
) => any | Promise<any> {
  return async (cmd, args) => {
    // eslint-disable-next-line no-console
    console.log('mockIPC', cmd, args);

    if (cmd === 'plugin:tauri-plugin-ucp-config|get_config_recent_folders') {
      return ['test'];
    }

    return {};
  };
}
