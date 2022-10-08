import { useEffect, useReducer, useState } from 'react';
import { ucpBackEnd } from './fakeBackend';

import './App.css';
import { GuiConfigHandler } from './utils/gui-config-handling';
import { appWindow } from '@tauri-apps/api/window';
import { UnlistenFn } from '@tauri-apps/api/event';
import { useGuiConfig } from './utils/swr-components';


// TODO: handling of scope permissions should be avoided
// better would be to move the file access into the backend
// or at least recreate the scope

const r = Math.floor(Math.random() * 10);

function Landing() {
  const [launchButtonState, setLaunchButtonState] = useState(false);
  const [browseResultState, setBrowseResultState] = useState("");
  const configResult = useGuiConfig();

  // needs better loading site
  if (configResult.isLoading) {
    return <p>Loading...</p>
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
    <div className="landing-app">
      <div>
        <h1>Welcome to Unofficial Crusader Patch 3</h1>
        <h4>
          Browse to a Stronghold Crusader installation folder to get started
        </h4>
        <div className="input-group mb-3">
          <select
            className="form-control"
            id="browseresult"
            onChange={(event) => {
              updateCurrentFolderSelectState(event.target.value)
            }}
            value={browseResultState}
          >
            {configHandler.getRecentGameFolders().map((recentFolder, index) =>
              <option key={index}>{recentFolder}</option>
            )}
          </select>
          <button
            id="browsebutton"
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const folder = await ucpBackEnd.openFolderDialog(
                browseResultState
              );
              if (folder !== undefined && folder.length > 0) {
                updateCurrentFolderSelectState(folder);
              }
            }}
          >
            Browse
          </button>
        </div>
        <div className="input-group mb-3">
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
    </div>
  );
}

export default function App() {
  return <Landing />;
}
