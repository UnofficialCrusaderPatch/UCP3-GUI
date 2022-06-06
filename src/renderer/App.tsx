import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';

import './App.css';

const r = Math.floor(Math.random() * 10);

const recentGameFolders: { index: number; folder: string; date: string }[] =
  window.electron.ucpBackEnd.getRecentGameFolders();

const mostRecentGameFolder = recentGameFolders.sort(
  (a: { folder: string; date: string }, b: { folder: string; date: string }) =>
    b.date.localeCompare(a.date)
)[0];

const Landing = () => {
  return (
    <div className="landing-app">
      <div>
        <h1>Welcome to Unofficial Crusader Patch 3</h1>
        <h4>
          Browse to a Stronghold Crusader installation folder to get started
        </h4>
        <div className="input-group mb-3">
          <input type="text" className="form-control" id="browseresult" />
          <button
            id="browsebutton"
            type="button"
            className="btn btn-primary"
            onClick={window.electron.ucpBackEnd.browseGameFolder}
          >
            Browse
          </button>
        </div>
        <div className="input-group mb-3">
          <button
            id="launchbutton"
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const a = document.querySelector(
                '#browseresult'
              ) as HTMLInputElement;
              return window.electron.ucpBackEnd.initializeMenuWindow(a.value);
            }}
          >
            Launch
          </button>
        </div>
      </div>
    </div>
  );
};

const Editor = () => {
  return <div>Hello!</div>;
};

export default function App() {
  return <Landing />;
  // return (
  //   <Router>
  //     <Routes>
  //       <Route path="/" element={<Landing />} />
  //     </Routes>
  //   </Router>
  // );
}
