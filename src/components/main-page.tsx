import './main-page.css';

import LanguageSelect from './language-select/language-select';
import { Overlay } from './overlay/overlay';
import CreditsButton from './credits/credits';
import Footer from './footer/footer';
import UcpTabs from './ucp-tabs/ucp-tabs';

import { ModalOkCancel } from './modals/ModalOkCancel';
import { CreatePluginModal } from './modals/CreatePluginModal';
import { ModalWindow } from './modals/abstract-modal';

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
      <ModalWindow />
      <ModalOkCancel />
      <CreatePluginModal />
    </>
  );
}
