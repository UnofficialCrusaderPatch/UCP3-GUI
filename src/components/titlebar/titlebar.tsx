/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import './titlebar.css';
import closeIcon from 'assets/misc/x-lg.svg';
import minimizeIcon from 'assets/misc/chevron-compact-down.svg';
import maximizeIcon from 'assets/misc/fullscreen.svg';
import maximizeExitIcon from 'assets/misc/fullscreen-exit.svg';

import { getCurrentWindow } from 'tauri/tauri-window';
import mainIcon from 'assets/ucp3.png';
import { useTranslation } from 'react-i18next';
import SvgHelper from 'components/general/svg-helper';
import { useEffect, useState } from 'react';
import {
  registerTauriEventListener,
  removeTauriEventListener,
} from 'tauri/tauri-hooks';
import { TauriEvent } from '@tauri-apps/api/event';

// is is currently not possible to get the title of the current window
// so for now, this placeholder will be used
const TITLE_PLACEHOLDER = 'Unofficial Crusader Patch 3 - GUI';

export default function Titlebar() {
  const [isMax, setIsMax] = useState(false);

  const [t] = useTranslation('gui-general');

  const currentWindow = getCurrentWindow();
  useEffect(() => {
    const resizeFunc = async () => {
      setIsMax(await currentWindow.isMaximized());
    };
    registerTauriEventListener(TauriEvent.WINDOW_RESIZED, resizeFunc);

    // initial
    // eslint-disable-next-line promise/catch-or-return
    currentWindow.isMaximized().then((isMaximized) => setIsMax(isMaximized));
    return () => {
      removeTauriEventListener(TauriEvent.WINDOW_RESIZED, resizeFunc);
    };
  }, [currentWindow]);

  return (
    <div data-tauri-drag-region className="titlebar">
      <div className="titlebar-icon" id="titlebar-icon">
        <img src={mainIcon} alt={t('gui-general:titlebar.alt.icon')} />
      </div>
      <div className="titlebar-title" id="titlebar-title">
        <div>{TITLE_PLACEHOLDER}</div>
      </div>
      <div
        className="titlebar-button"
        id="titlebar-minimize"
        onClick={() => currentWindow.minimize()}
      >
        <SvgHelper
          href={`${minimizeIcon}#chevron-compact-down`}
          title={t('gui-general:titlebar.alt.minimize')}
        />
      </div>
      <div
        className="titlebar-button"
        id="titlebar-maximize"
        onClick={() => currentWindow.toggleMaximize()}
      >
        {isMax ? (
          <SvgHelper
            href={`${maximizeExitIcon}#fullscreen-exit`}
            title={t('gui-general:titlebar.alt.maximize')}
          />
        ) : (
          <SvgHelper
            href={`${maximizeIcon}#fullscreen`}
            title={t('gui-general:titlebar.alt.maximize')}
          />
        )}
      </div>
      <div
        className="titlebar-button"
        id="titlebar-close"
        // needed, since "close()"" currently does not trigger the event
        onClick={() => currentWindow.emit(TauriEvent.WINDOW_CLOSE_REQUESTED)}
      >
        <SvgHelper
          href={`${closeIcon}#x-lg`}
          title={t('gui-general:titlebar.alt.close')}
        />
      </div>
    </div>
  );
}
