import { useEffect, useReducer, useState } from 'react';
import { ucpBackEnd } from './fakeBackend';

import './App.css';
import { RecentFolderHandler } from './utils/recent-folder-handling';
import { appWindow } from '@tauri-apps/api/window';
import { UnlistenFn } from '@tauri-apps/api/event';


// TODO: handling of scope permissions should be avoided
// better would be to move the file access into the backend
// or at least recreate the scope

const r = Math.floor(Math.random() * 10);

function Landing() {
  const [launchButtonState, setLaunchButtonState] = useState(false);
  const [browseResultState, setBrowseResultState] = useState('');

  // in strict dev mode, certain hooks like useEffect execute twice to trigger issues
  // this is a work around here, I am open to use a better solution
  // currently, the file is simply saved and loaded twice
  const [recentGameFolderHandlerContainer, setRecentGameFolderHandlerContainer] = useState<{
    handler: RecentFolderHandler,
    windowUnlisten: null | UnlistenFn
  }>({
    handler: new RecentFolderHandler(),
    windowUnlisten: null,
  });
  const recentGameFolderHandler = recentGameFolderHandlerContainer.handler;

  const updateCurrentFolderSelectState = (folder: string) => {
    recentGameFolderHandler.addToRecentFolders(folder);
    setBrowseResultState(folder);
    setLaunchButtonState(true);
  };

  useEffect(() => {
    (async () => {
      await recentGameFolderHandler.loadRecentGameFolders();

      // this does not protect from the double event, but maybe from recalls... which should not happen
      const currentUnlisten = recentGameFolderHandlerContainer.windowUnlisten;
      recentGameFolderHandlerContainer.windowUnlisten = await appWindow.onCloseRequested(async () => {
        if (currentUnlisten) {
          currentUnlisten();
        }
        await recentGameFolderHandler.saveRecentFolders();
      });
      setRecentGameFolderHandlerContainer({...recentGameFolderHandlerContainer});
      updateCurrentFolderSelectState(recentGameFolderHandler.getMostRecentGameFolder());
    })();
  }, []);

  // needs better loading site
  if (!recentGameFolderHandler.isInitialized()) {
    return <p>Loading...</p>
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
            {recentGameFolderHandler.getRecentGameFolders().map((recentFolder, index) =>
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
