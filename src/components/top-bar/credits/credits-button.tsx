import './credits-button.css';

import { useTranslation } from 'react-i18next';
import { setOverlayContent } from '../../overlay/overlay';
import { Credits } from '../../credits/credits';

export default function CreditsButton() {
  const [t] = useTranslation(['gui-landing']);
  return (
    <button
      type="button"
      className="credits-button"
      onClick={() => setOverlayContent(Credits, true, true)}
    >
      {t('gui-landing:credits.open')}
    </button>
  );
}
