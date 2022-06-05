import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);

// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);

  document.getElementById('dirs')?.addEventListener('click', () => {
    console.log('click!');
    window.postMessage({
      type: 'select-dirs',
    });
  });
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
