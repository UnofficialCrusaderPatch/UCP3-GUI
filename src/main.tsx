import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Window from './components/window';

// import for basic functionality:
import 'util/scripts/logging';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Window />} />
        <Route path="/index.html" element={<Window />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
