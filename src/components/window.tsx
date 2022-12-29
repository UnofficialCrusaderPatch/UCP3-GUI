import 'localization/i18n';
import Main from './main-page';
import Titlebar from './titlebar/titlebar';

import './variables.css';
import './base.css';
import './window.css';
import { useLanguage } from 'hooks/jotai/helper';

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
