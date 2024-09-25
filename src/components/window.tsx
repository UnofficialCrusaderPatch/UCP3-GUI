import './variables.css';
import './base.css';
import './window.css';

import { Suspense } from 'react';
import Titlebar from './titlebar/titlebar';
import Main from './main-page';

// // adds dev object to globalThis, allowing to use some functions in the web console
if (import.meta.env.DEV) {
  import('../function/dev');
}

function WindowContent() {
  return (
    <>
      <div className="page-titlebar">
        <Titlebar />
      </div>
      <div className="page-main">
        <Main />
      </div>
    </>
  );
}

export default function Window() {
  return (
    <Suspense>
      <WindowContent />
    </Suspense>
  );
}
