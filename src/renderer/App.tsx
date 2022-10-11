import { useEffect, useReducer, useState } from 'react';
import { ucpBackEnd } from './fakeBackend';

import './App.css';
import { GuiConfigHandler } from './utils/gui-config-handling';
import { useGuiConfig } from './utils/swr-components';

// TODO: handling of scope permissions should be avoided
// better would be to move the file access into the backend
// or at least recreate the scope

const r = Math.floor(Math.random() * 10);

function Landing() {
  const [launchButtonState, setLaunchButtonState] = useState(false);
  const [browseResultState, setBrowseResultState] = useState('');
  const configResult = useGuiConfig();

  // needs better loading site
  if (configResult.isLoading) {
    return <p>Loading...</p>;
  }

  const configHandler = configResult.data as GuiConfigHandler;
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
          <h1 className="mb-3">Welcome to Unofficial Crusader Patch 3</h1>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="browseresult">
            Browse to a Stronghold Crusader installation folder to get started:
          </label>
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
              onClick={() => ucpBackEnd.createEditorWindow(browseResultState)}
            >
              Launch
            </button>
          </div>
        </div>
        <div className="mb-3 h-75 d-flex flex-column">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="recentfolders">
            Use one of the recently used folders:
          </label>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
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
            {configHandler
              .getRecentGameFolders()
              .filter((_, index) => index !== 0)
              .map((recentFolder, index) => (
                <input
                  type="button"
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="list-group-item list-group-item-action"
                  value={recentFolder}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <Landing />;
}
