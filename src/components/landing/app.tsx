import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ucpBackEnd } from './fakeBackend';

import 'styling/App.css';

import LanguageSelect from './language-select';
import { useRecentFolders } from './utils/swr-components';
import { RecentFolderHelper } from './utils/gui-config-helper';

const r = Math.floor(Math.random() * 10);

function Landing() {
  const [landingState, setLandingState] = useState({
    lauchButton: false,
    browseResult: '',
  });
  const recentFolderResult = useRecentFolders();

  // lang
  const [t] = useTranslation(['gui-general', 'gui-landing']);

  // needs better loading site
  if (recentFolderResult.isLoading) {
    return <p>{t('gui-general:loading')}</p>;
  }

  const recentFolderHelper = recentFolderResult.data as RecentFolderHelper;

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

  return (
    <div className="container-md h-75 d-flex flex-column justify-content-start">
      <div className="mb-3">
        <h1 className="mb-3">{t('gui-landing:title')}</h1>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label htmlFor="browseresult">{t('gui-landing:select.folder')}</label>
        <div className="input-group">
          <input
            id="browseresult"
            type="text"
            className="form-control"
            readOnly
            role="button"
            onClick={async () => {
              const folder = await ucpBackEnd.openFolderDialog(
                landingState.browseResult
              );
              if (folder !== undefined && folder.length > 0) {
                updateCurrentFolderSelectState(folder);
              }
            }}
            value={landingState.browseResult}
          />
          <button
            id="launchbutton"
            type="button"
            className="btn btn-primary"
            disabled={landingState.lauchButton !== true}
            onClick={() =>
              ucpBackEnd.createEditorWindow(landingState.browseResult)
            }
          >
            {t('gui-landing:launch')}
          </button>
        </div>
      </div>
      <div className="flex-grow-1 overflow-hidden d-flex flex-column justify-content-start">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label htmlFor="recentfolders">{t('gui-landing:old.folders')}</label>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div
          id="recentfolders"
          className="list-group overflow-auto bg-secondary"
          onClick={(event) => {
            const inputTarget = event.target as HTMLInputElement;
            if (inputTarget.textContent) {
              updateCurrentFolderSelectState(inputTarget.textContent as string);
            }
          }}
        >
          {recentFolderHelper
            .getRecentGameFolders()
            .filter((_, index) => index !== 0)
            .map((recentFolder, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="list-group-item list-group-item-action list-group-item-dark d-flex justify-content-between align-items-center"
                role="button"
              >
                {recentFolder}
                <input
                  type="button"
                  style={{ width: '0.25em', height: '0.25em' }}
                  className="btn-close"
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
  );
}

export default function App() {
  const [langSelectActive, setLangSelectActive] = useState(false);
  const [t] = useTranslation(['gui-landing']);

  return (
    <div className="vh-100 d-flex flex-column justify-content-center">
      {langSelectActive ? (
        <LanguageSelect closeLangSelect={() => setLangSelectActive(false)} />
      ) : (
        [
          <div className="position-absolute top-0 end-0" key="to.language">
            <button
              type="button"
              className="btn btn-primary m-3"
              onClick={() => setLangSelectActive(true)}
            >
              {t('gui-landing:language.selection')}
            </button>
          </div>,
          <Landing key="landing" />,
        ]
      )}
    </div>
  );
}
