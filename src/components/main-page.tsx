import LanguageSelect from './language-select/language-select';
import { Overlay } from './overlay/overlay';
import CreditsButton from './credits/credits';
import Footer from './footer/footer';
import UcpTabs from './ucp-tabs/ucp-tabs';

import './main-page.css';

export default function Main() {
  return (
    <>
      <CreditsButton />
      <LanguageSelect />
      {/* Last, to hide everything */}
      <Overlay />
      <div className="flex-default">
        <div className="tabs-wrapper">
          <UcpTabs />
        </div>
        <div className="footer-wrapper">
          <Footer />
        </div>
      </div>
    </>
  );
}
