import 'localization/i18n';
import { useLanguage } from './general/jotai-hooks';
import Main from './main-page';
import Titlebar from './titlebar/titlebar';

import './variables.css';
import './base.css';
import './window.css';

export default function Window() {
  const languageState = useLanguage();

  if (languageState.isEmpty()) {
    return <div />;
  }

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
