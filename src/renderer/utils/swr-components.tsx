import { KeyedMutator } from 'swr';
import useSWRImmutable from 'swr/immutable'; // only fetches once
import { GuiConfigHandler } from './gui-config-handling';
import { registerForWindowClose } from './tauri-hooks';

interface SwrResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  mutate: KeyedMutator<T>;
}

// keys are used to identify and cache the request, so they need to be unique for different sources
const SWR_KEYS = {
  GUI_CONFIG: 'ucp.gui.config',
};

// eslint-disable-next-line import/prefer-default-export
export function useGuiConfig(): SwrResult<GuiConfigHandler> {
  const { data, error, mutate } = useSWRImmutable(
    SWR_KEYS.GUI_CONFIG,
    async () => {
      const guiConfig = new GuiConfigHandler();
      await guiConfig.loadGuiConfig();
      registerForWindowClose(SWR_KEYS.GUI_CONFIG, async () => {
        await guiConfig.saveGuiConfig(); // no idea if need to keep object binding
      });
      return guiConfig;
    }
  );
  return {
    data,
    isLoading: !data,
    isError: !!error,
    mutate,
  };
}
