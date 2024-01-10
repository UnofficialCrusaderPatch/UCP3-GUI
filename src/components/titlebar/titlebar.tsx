/* eslint-disable import/no-unresolved */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './titlebar.css';
import closeIcon from 'assets/misc/x-lg.svg?raw';
import minimizeIcon from 'assets/misc/chevron-compact-down.svg?raw';
import maximizeIcon from 'assets/misc/fullscreen.svg?raw';
import maximizeExitIcon from 'assets/misc/fullscreen-exit.svg?raw';
import mainIcon from 'assets/ucp3.png';

import { TauriEvent } from '@tauri-apps/api/event';
import { atom, useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import SvgHelper from '../general/svg-helper';
import { getCurrentWindow } from '../../tauri/tauri-window';
import { registerTauriEventListener } from '../../tauri/tauri-hooks';
import { getStore } from '../../hooks/jotai/base';

const TITLE_ATOM = atom(getCurrentWindow().title());
const IS_MAX_ATOM = atom(false);

registerTauriEventListener(TauriEvent.WINDOW_RESIZED, async () => {
  getStore().set(IS_MAX_ATOM, await getCurrentWindow().isMaximized());
});

export default function Titlebar() {
  const title = useAtomValue(TITLE_ATOM);
  const isMax = useAtomValue(IS_MAX_ATOM);

  const [t] = useTranslation('gui-general');

  const currentWindow = getCurrentWindow();
  return (
    <div data-tauri-drag-region className="titlebar">
      <div className="titlebar-icon" id="titlebar-icon">
        <img src={mainIcon} alt={t('gui-general:titlebar.alt.icon')} />
      </div>
      <div className="titlebar-title" id="titlebar-title">
        <div>{title}</div>
      </div>
      <div
        className="titlebar-button"
        id="titlebar-minimize"
        onClick={() => currentWindow.minimize()}
      >
        <SvgHelper
          href="#chevron-compact-down"
          title={t('gui-general:titlebar.alt.minimize')}
          data={minimizeIcon}
        />
      </div>
      <div
        className="titlebar-button"
        id="titlebar-maximize"
        onClick={() => currentWindow.toggleMaximize()}
      >
        {isMax ? (
          <SvgHelper
            href="#fullscreen-exit"
            title={t('gui-general:titlebar.alt.maximize')}
            data={maximizeExitIcon}
          />
        ) : (
          <SvgHelper
            href="#fullscreen"
            title={t('gui-general:titlebar.alt.maximize')}
            data={maximizeIcon}
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
          href="#x-lg"
          title={t('gui-general:titlebar.alt.close')}
          data={closeIcon}
        />
      </div>
    </div>
  );
}
