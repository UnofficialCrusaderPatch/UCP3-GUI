
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';

import App from './App';
import Manager from './Manager';

const pageFunctions = {
  landing: <App />,
  editor: <Manager />,
};

function FittingPage() {
  const [searchParams, _] = useSearchParams();
  const windowValue = searchParams.get("window");

  if (windowValue) {
    return pageFunctions[windowValue];
  }
  return pageFunctions.landing;
}

export default () => {
  return (
    // this router is apparently only for browsers... but it was the only on that kept the search param part...
    // TODO: needs test with compiled version
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FittingPage/>} />
        <Route path="/index.html" element={<FittingPage/>} />
      </Routes>
    </BrowserRouter>
  );
};
