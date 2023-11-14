import './variables.css';
import './base.css';
import './window.css';

import { useAtomValue } from 'jotai';
import { LANGUAGE_STATE_ATOM } from 'localization/i18n';
import { Suspense } from 'react';
import Titlebar from './titlebar/titlebar';
import Main from './main-page';

function WindowContent() {
  useAtomValue(LANGUAGE_STATE_ATOM);
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
