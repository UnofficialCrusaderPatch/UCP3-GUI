import {
  BrowserRouter,
  Route,
  Routes,
  useSearchParams,
} from 'react-router-dom';

import Landing from './landing/landing';
import Manager from './editor/manager';
import { useLanguage } from './general/swr-hooks';
import Titlebar from './titlebar/titlebar';

import './view-manager.css';

const pageFunctions: { [key: string]: JSX.Element } = {
  landing: <Landing />,
  editor: <Manager />,
};

function FittingPage() {
  const languageState = useLanguage();

  const [searchParams] = useSearchParams();
  const windowValue = searchParams.get('window');

  if (languageState.isLoading) {
    return <div />;
  }

  if (windowValue) {
    return pageFunctions[windowValue];
  }
  return pageFunctions.landing;
}

function Page() {
  return (
    <>
      <div className="page-titlebar">
        <Titlebar />
      </div>
      <div className="page-main">
        <FittingPage />
      </div>
    </>
  );
}

export default function View() {
  return (
    // this router is apparently only for browsers... but it was the only on that kept the search param part...
    // TODO: needs test with compiled version
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Page />} />
        <Route path="/index.html" element={<Page />} />
      </Routes>
    </BrowserRouter>
  );
}
