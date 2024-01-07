/* eslint-disable promise/catch-or-return */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import './titlebar.css';

import { TauriEvent } from '@tauri-apps/api/event';
import { atom, useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';

import mainIcon from 'assets/ucp3.png';

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          className="bi bi-chevron-compact-down"
          id="chevron-compact-down"
          viewBox="0 0 16 16"
        >
          <title>{t('gui-general:titlebar.alt.minimize')}</title>
          <path
            fillRule="evenodd"
            d="M1.553 6.776a.5.5 0 0 1 .67-.223L8 9.44l5.776-2.888a.5.5 0 1 1 .448.894l-6 3a.5.5 0 0 1-.448 0l-6-3a.5.5 0 0 1-.223-.67z"
          />
        </svg>
      </div>
      <div
        className="titlebar-button"
        id="titlebar-maximize"
        onClick={() => currentWindow.toggleMaximize()}
      >
        {isMax ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-fullscreen-exit"
            id="fullscreen-exit"
            viewBox="0 0 16 16"
          >
            <title>{t('gui-general:titlebar.alt.maximize')}</title>
            <path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-fullscreen"
            id="fullscreen"
            viewBox="0 0 16 16"
          >
            <title>{t('gui-general:titlebar.alt.maximize')}</title>
            <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z" />
          </svg>
        )}
      </div>
      <div
        className="titlebar-button"
        id="titlebar-close"
        // needed, since "close()"" currently does not trigger the event
        onClick={() => currentWindow.emit(TauriEvent.WINDOW_CLOSE_REQUESTED)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          className="bi bi-x-lg"
          id="x-lg"
          viewBox="0 0 16 16"
        >
          <title>{t('gui-general:titlebar.alt.close')}</title>
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
        </svg>
      </div>
    </div>
  );
}
