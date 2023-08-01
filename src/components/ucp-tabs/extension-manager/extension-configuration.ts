import { ExtensionsState } from 'function/global/types';

function buildExtensionConfigurationDB(extensionsState: ExtensionsState) {
  // ae has the order that the highest is the last added.
  const ae = [...extensionsState.activeExtensions];
  // So we reverse it
  ae.reverse();

  console.log('Activated extensions', ae);

  const db = {};

  return {
    ...extensionsState,
    configuration: db,
  } as ExtensionsState;
}

// eslint-disable-next-line import/prefer-default-export
export { buildExtensionConfigurationDB };
