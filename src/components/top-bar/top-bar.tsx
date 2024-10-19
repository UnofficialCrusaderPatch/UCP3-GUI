import './top-bar.css';

import { useAtomValue } from 'jotai';
import { OVERLAY_ACTIVE_ATOM } from '../overlay/overlay';
import CreditsButton from './credits/credits-button';
import { ReloadButton } from './restart/reload-button';
import LanguageSelect from './language-select/language-select';
import { NewsButton } from './news/news-button';

// eslint-disable-next-line import/prefer-default-export
export function TopBar() {
  const overlayActive = useAtomValue(OVERLAY_ACTIVE_ATOM);
  return (
    <div
      className="top-bar"
      {...{ inert: overlayActive ? '' : undefined }} // inert is not yet supported by React
    >
      <NewsButton />
      <span className="mx-1" />
      <CreditsButton />
      <span className="mx-1" />
      <ReloadButton />
      <LanguageSelect />
    </div>
  );
}
