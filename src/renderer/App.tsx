import { useEffect, useReducer, useState } from 'react';
import { ucpBackEnd } from './fakeBackend';

import './App.css';
import { GuiConfigHandler } from './utils/gui-config-handling';
import { useGuiConfig } from './utils/swr-components';
import { redirect, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';


// TODO: handling of scope permissions should be avoided
// better would be to move the file access into the backend
// or at least recreate the scope

const r = Math.floor(Math.random() * 10);

function Landing() {
  const [searchParams] = useSearchParams();
  const [launchButtonState, setLaunchButtonState] = useState(false);
  const [browseResultState, setBrowseResultState] = useState("");
  const configResult = useGuiConfig();

  const navigate = useNavigate();

  // lang
  const [t] = useTranslation();

  const configHandler = configResult.data as GuiConfigHandler;

  // always executed
  useEffect(() => {
    if (!configResult.isLoading) {
      const configLang = configHandler.getLanguage();
      if (configLang && searchParams.get("lang") !== configLang) {
        navigate(`/?lang=${configLang}`); // to set language -> I do not really like this...
      }
    }
  });

  // needs better loading site
  if (configResult.isLoading) {
    return <p>{t("general:loading")}</p>
  }

  const updateCurrentFolderSelectState = (folder: string) => {
    configHandler.addToRecentFolders(folder);
    setBrowseResultState(folder);
    setLaunchButtonState(true);
  };

  // set initial state
  if (!browseResultState && configHandler.getMostRecentGameFolder()) {
    updateCurrentFolderSelectState(configHandler.getMostRecentGameFolder());
  }

  return (
    <div className="vh-100 d-flex flex-column justify-content-center">
      <div className="h-75 container-md d-flex flex-column justify-content-center">
        <div className="mb-3 flex-grow-1">
          <h1 className="mb-3">{t("landing:title")}</h1>
          <label htmlFor="browseresult">{t("landing:selectfolder")}</label>
          <div className="input-group">
            <input
              id="browseresult"
              type="text"
              className="form-control"
              readOnly
              role="button"
              onClick={async () => {
                const folder = await ucpBackEnd.openFolderDialog(
                  browseResultState
                );
                if (folder !== undefined && folder.length > 0) {
                  updateCurrentFolderSelectState(folder);
                }
              }}
              value={browseResultState}
            />
            <button
              id="launchbutton"
              type="button"
              className="btn btn-primary"
              disabled={launchButtonState !== true}
              onClick={() => ucpBackEnd.createEditorWindow(browseResultState, configHandler.getLanguage())}
            >
              {t("landing:launch")}
            </button>
          </div>
        </div>
        <div className="mb-3 h-75 d-flex flex-column">
          <label htmlFor="recentfolders">{t("landing:oldfolders")}</label>
          <div
            id="recentfolders"
            className="list-group bg-light h-75 overflow-auto"
            onClick={(event) => {
              const inputTarget = event.target as HTMLInputElement;
              if (inputTarget.value) {
                updateCurrentFolderSelectState(inputTarget.value);
              }
            }}
          >
            {configHandler.getRecentGameFolders().filter((_, index) => index !== 0).map((recentFolder, index) =>
              <input type="button" key={index} className="list-group-item list-group-item-action" value={recentFolder} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <Landing />;
}
