import 'localization/i18n';
import { useLanguage } from './general/swr-hooks';
import Main from './main-page';
import Titlebar from './titlebar/titlebar';

import './variables.css';
import './base.css';
import './window.css';

export default function Window() {
  const languageState = useLanguage();

  if (languageState.isLoading) {
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
