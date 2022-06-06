import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css';
import $ from 'jquery';
import Popper from 'popper.js';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import React from 'react';
import ReactDOM from 'react-dom';

import ViewManager from './ViewManager';

// ReactDOM.render(<ViewManager />, document.getElementById('root'));

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<ViewManager />);

// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
