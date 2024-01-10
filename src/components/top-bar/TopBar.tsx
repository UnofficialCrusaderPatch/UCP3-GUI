import './TopBar.css';

import { useAtomValue } from 'jotai';
import { OVERLAY_ACTIVE_ATOM } from '../overlay/overlay';
import CreditsButton from './credits/CreditsButton';
import { RestartButton } from './restart/RestartButton';
import LanguageSelect from './language-select/language-select';

// eslint-disable-next-line import/prefer-default-export
export function TopBar() {
  const overlayActive = useAtomValue(OVERLAY_ACTIVE_ATOM);
  return (
    <div
      className="top-bar"
      {...{ inert: overlayActive ? '' : undefined }} // inert is not yet supported by React
    >
      <CreditsButton />
      <span className="mx-1" />
      <RestartButton />
      <LanguageSelect />
    </div>
  );
}
