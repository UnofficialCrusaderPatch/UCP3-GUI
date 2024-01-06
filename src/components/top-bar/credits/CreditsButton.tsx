import './CreditsButton.css';

import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';

import { OVERLAY_ACTIVE_ATOM, setOverlayContent } from '../../overlay/overlay';
import { Credits } from '../../credits/credits';

export default function CreditsButton() {
  const overlayActive = useAtomValue(OVERLAY_ACTIVE_ATOM);

  const [t] = useTranslation(['gui-landing']);
  return (
    <button
      type="button"
      className="credits-button"
      onClick={() => setOverlayContent(Credits, true, true)}
      disabled={overlayActive}
    >
      {t('gui-landing:credits.open')}
    </button>
  );
}
