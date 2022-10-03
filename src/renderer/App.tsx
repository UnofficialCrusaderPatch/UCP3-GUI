import { useEffect, useReducer, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import { ucpBackEnd } from './fakeBackend';

import './App.css';
import { KeyValueReducer } from './GlobalState';

const r = Math.floor(Math.random() * 10);

const Landing = () => {
  const [launchButtonState, setLaunchButtonState] = useState(false);
  const [browseResultState, setBrowseResultState] = useState('');
  const [mostRecentGameFolder, setMostRecentGameFolder] = useReducer(
    KeyValueReducer<unknown>(),
    { index: 0, folder: "", date: "" }
  );

  useEffect(() => {
    (async () => {
      const recentGameFolders: { index: number; folder: string; date: string }[] =
      await ucpBackEnd.getRecentGameFolders();
    
      const receivedRecentFolders = recentGameFolders.sort(
        (a: { folder: string; date: string }, b: { folder: string; date: string }) =>
          b.date.localeCompare(a.date)
      )[0];
      if (receivedRecentFolders) {
        setMostRecentGameFolder({
          type: "reset",
          value: receivedRecentFolders
        });
      };
    })();
  }, [])

  return (
    <div className="landing-app">
      <div>
        <h1>Welcome to Unofficial Crusader Patch 3</h1>
        <h4>
          Browse to a Stronghold Crusader installation folder to get started
        </h4>
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            id="browseresult"
            value={browseResultState}
            readOnly
          />
          <button
            id="browsebutton"
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const folder =
                await ucpBackEnd.openFolderDialog(mostRecentGameFolder.folder as string);
              if (folder !== undefined && folder.length > 0) {
                setBrowseResultState(folder);
                setLaunchButtonState(true);
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
            onClick={() => {
              const a = document.querySelector(
                '#browseresult'
              ) as HTMLInputElement;
              return ucpBackEnd.createEditorWindow(a.value);
            }}
          >
            Launch
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return <Landing />;
}
