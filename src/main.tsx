import React from 'react';
import ReactDOM from 'react-dom/client';
import ViewManager from 'components/view-manager';
import 'localization/i18n';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ViewManager />
  </React.StrictMode>
);
