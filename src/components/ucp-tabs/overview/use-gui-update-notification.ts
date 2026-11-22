import { useEffect, useRef } from 'react';
import { shellOpen } from '../../../tauri/tauri-shell';
import Logger from '../../../util/scripts/logging';
import { makeToast } from '../../toasts/toasts-display';

const LOGGER = new Logger('use-gui-update-notification.ts');

export default function useGUIUpdateNotification(hasGUIUpdate: boolean) {
  const notified = useRef(false);

  useEffect(() => {
    if (!hasGUIUpdate || notified.current) return;

    // Tab renders, query retries and StrictMode must not repeat the notice.
    notified.current = true;
    makeToast({
      title: 'GUI Update available!',
      // Tauri's updater supports AppImages on Linux, but not .deb installs.
      body: 'Download the latest GUI from the releases page.',
      customDelay: 60 * 1000,
      onClick: () => {
        shellOpen(
          'https://github.com/UnofficialCrusaderPatch/UCP3-GUI/releases',
        ).catch((error: unknown) => {
          LOGGER.msg('Could not open GUI releases: {}', error).error();
        });
      },
    });
  }, [hasGUIUpdate]);
}
