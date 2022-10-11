import React from 'react';
import ReactDOM from 'react-dom/client';
import ViewManager from './renderer/ViewManager';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ViewManager />
  </React.StrictMode>
);
