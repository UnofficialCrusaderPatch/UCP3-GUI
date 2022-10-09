import React from 'react'
import ReactDOM from 'react-dom/client'
import ViewManager from './renderer/ViewManager';
import "./renderer/i18n/i18n";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ViewManager/>
  </React.StrictMode>
)
