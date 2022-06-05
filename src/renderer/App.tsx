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

const Hello = () => {
  return (
    <div>
      <input type="file" id="dirs" />
      <button
        id="browsebutton"
        type="button"
        onClick={window.electron.ucpBackEnd.browseGameFolder}
      >
        Browse
      </button>
      <div className="Hello">
        <img width="200px" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div>{JSON.stringify(mostRecentGameFolder)}</div>
      <div className="Hello">
        {[...Array(r)].map((x, i) => (
          <div key="hello-{i}">A{i}</div>
        ))}
        <a
          href="https://electron-react-boilerplate.js.org/"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="books">
              📚
            </span>
            Read our docs
          </button>
        </a>
        <a
          href="https://github.com/sponsors/electron-react-boilerplate"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="books">
              🙏
            </span>
            Donate
          </button>
        </a>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
