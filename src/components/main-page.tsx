import './main-page.css';

import { Overlay } from './overlay/overlay';
import Footer from './footer/footer';
import UcpTabs from './ucp-tabs/ucp-tabs';
import { ModalWindow } from './modals/abstract-modal';
import ToastDisplay from './modals/toasts/toasts-display';
import { TopBar } from './top-bar/top-bar';

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
