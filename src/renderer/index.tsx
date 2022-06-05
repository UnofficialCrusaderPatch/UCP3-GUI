import { createRoot } from 'react-dom/client';

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
