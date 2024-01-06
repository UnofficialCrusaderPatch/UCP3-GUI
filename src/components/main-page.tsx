import './main-page.css';

import LanguageSelect from './top-bar/language-select/language-select';
import { Overlay } from './overlay/overlay';
import CreditsButton from './top-bar/credits/CreditsButton';
import Footer from './footer/footer';
import UcpTabs from './ucp-tabs/ucp-tabs';
import { ModalWindow } from './modals/abstract-modal';
import { ToastDisplay } from './modals/toasts/ToastsDisplay';
import { TopBar } from './top-bar/TopBar';

export default function Main() {
  return (
    <>
      <TopBar />
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
      <ModalWindow />
      <ToastDisplay />
    </>
  );
}
