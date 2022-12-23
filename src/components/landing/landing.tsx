/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import languages from 'localization/languages.json';

import './landing.css';
import translateIcon from 'assets/misc/translate.svg';

import { RecentFolderHelper } from 'config/gui/recent-folder-helper';
import SvgHelper from 'components/general/svg-helper';
import { createEditorWindow } from 'function/window-actions';
import { openFolderDialog } from 'tauri/tauri-dialog';
import { Language, useLanguage, useRecentFolders } from '../general/swr-hooks';

function LanguageSelect() {
  const langResult = useLanguage();
  const { t } = useTranslation('gui-landing');

  // needs better loading site
  if (langResult.isLoading) {
    return <p>{t('gui-general:loading')}</p>;
  }

  const langHandler = langResult.data as Language;
  return (
    <div className="d-flex align-items-stretch">
      <div className="d-flex dark-dropdown ps-3 pe-2">
        <SvgHelper
          href={`${translateIcon}#translate`}
          title={t('gui-landing:select.language')}
        />
      </div>
      <select
        className="dark-dropdown"
        value={langHandler.getLanguage() as string}
        onChange={(event) => {
          const buttonTarget = event.target as HTMLSelectElement;
          if (buttonTarget.value) {
            langHandler.setLanguage(buttonTarget.value);
          }
        }}
      >
        {Object.entries(languages).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Landing() {
  const [landingState, setLandingState] = useState({
    lauchButton: false,
    browseResult: '',
  });
  const [recentFolderResult] = useRecentFolders();

  // lang
  const [t] = useTranslation(['gui-general', 'gui-landing']);

  // needs better loading site
  if (recentFolderResult.isEmpty()) {
    return <p>{t('gui-general:loading')}</p>;
  }

  const recentFolderHelper = recentFolderResult
    .get()
    .getOrThrow() as RecentFolderHelper;

  const updateCurrentFolderSelectState = (folder: string) => {
    recentFolderHelper.addToRecentFolders(folder);
    setLandingState({
      lauchButton: true,
      browseResult: folder,
    });
  };

  // set initial state
  if (
    !landingState.browseResult &&
    recentFolderHelper.getMostRecentGameFolder()
  ) {
    updateCurrentFolderSelectState(
      recentFolderHelper.getMostRecentGameFolder()
    );
  }

  const onClickUpdateRecentFolder = (event: MouseEvent<HTMLDivElement>) => {
    const inputTarget = event.target as HTMLDivElement;
    if (inputTarget.textContent) {
      updateCurrentFolderSelectState(inputTarget.textContent as string);
    }
  };

  return (
    <div className="h-100 position-relative">
      <div className="background-image" />
      <div className="language-select-container">
        <LanguageSelect />
      </div>

      <div className="margin-blocker" />
      <div className="landing-container">
        <div className="mb-5">
          <h1 className="mb-4" style={{ marginTop: 60 }}>
            {t('gui-landing:title')}
          </h1>
          <label htmlFor="browseresult">{t('gui-landing:select.folder')}</label>
          <div className="d-flex mt-2">
            <div className="textInput">
              <input
                id="browseresult"
                type="text"
                className="form-control"
                readOnly
                role="button"
                onClick={async () =>
                  (await openFolderDialog(landingState.browseResult)).ifPresent(
                    updateCurrentFolderSelectState
                  )
                }
                value={landingState.browseResult}
              />
            </div>
            <button
              id="launchbutton"
              type="button"
              className="launch-button"
              disabled={landingState.lauchButton !== true}
              onClick={() => createEditorWindow(landingState.browseResult)}
            >
              <div className="launchtext">{t('gui-landing:launch')}</div>
            </button>
          </div>
        </div>
        <div className="flex-grow-1 overflow-hidden d-flex flex-column justify-content-start">
          <label
            htmlFor="recentfolders"
            style={{ color: 'rgb(155, 155, 155)' }}
          >
            {t('gui-landing:old.folders')}
          </label>
          <div
            id="recentfolders"
            className="overflow-hidden mt-2 recent-folders"
          >
            {recentFolderHelper
              .getRecentGameFolders()
              .filter((_, index) => index !== 0)
              .map((recentFolder) => (
                <div
                  key={recentFolder}
                  className="px-2 file-selector d-flex justify-content-between align-items-center"
                  role="button"
                  title={recentFolder}
                  onClick={onClickUpdateRecentFolder}
                >
                  <div className="death90">{recentFolder}</div>
                  <input
                    type="button"
                    style={{
                      width: '0.25em',
                      height: '0.25em',
                      color: 'white',
                    }}
                    className="btn-close btn-close-white"
                    aria-label="Close"
                    onClick={(event) => {
                      event.stopPropagation();
                      recentFolderHelper.removeFromRecentFolders(recentFolder);
                      updateCurrentFolderSelectState(
                        recentFolderHelper.getMostRecentGameFolder()
                      );
                    }}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
