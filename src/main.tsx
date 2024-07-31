import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// import for basic functionality:
import 'util/scripts/logging';
import { QueryClient } from '@tanstack/query-core';
import { useHydrateAtoms } from 'jotai/utils';
import { queryClientAtom } from 'jotai-tanstack-query';
import { Provider } from 'jotai';

import { QueryClientProvider } from '@tanstack/react-query';
import Window from './components/window';
import { getStore } from './hooks/jotai/base';

const queryClient = new QueryClient();

// eslint-disable-next-line react/prop-types
const HydrateAtoms = ({ children }) => {
  useHydrateAtoms([[queryClientAtom, queryClient]]);
  return children;
};

// TODO: bug: extensions are not listed if main.tsx contains wrapper for react-query
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={getStore()}>
        {/*
   This Provider initialisation step is needed so that we reference the same
   queryClient in both atomWithQuery and other parts of the app. Without this,
   our useQueryClient() hook will return a different QueryClient object
	*/}
        <HydrateAtoms>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Window />} />
              <Route path="/index.html" element={<Window />} />
            </Routes>
          </BrowserRouter>
        </HydrateAtoms>
      </Provider>
    </QueryClientProvider>
  </React.StrictMode>,
);
