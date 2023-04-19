import {
  OverlayContentProps,
  useOverlayContent,
} from 'components/overlay/overlay';
import { useTranslation } from 'react-i18next';

import './credits.css';

// eslint-disable-next-line import/no-unresolved
import credits from './credits.txt?raw';

function Credits(props: OverlayContentProps) {
  const { closeFunc } = props;

  const [t] = useTranslation(['gui-general', 'gui-landing']);

  return (
    <div className="credits-container">
      <h1 className="credits-title">{t('gui-landing:credits.title')}</h1>
      <div className="credits-text-box parchment-box">
        <div className="credits-text-wrapper">
          <div className="credits-text">{credits}</div>
        </div>
      </div>
      <button type="button" className="credits-close" onClick={closeFunc}>
        {t('gui-general:close')}
      </button>
    </div>
  );
}

export default function CreditsButton() {
  const { setOverlayContent } = useOverlayContent();

  const [t] = useTranslation(['gui-landing']);
  return (
    <button
      type="button"
      className="credits-button"
      onClick={() => setOverlayContent(Credits)}
    >
      {t('gui-landing:credits.open')}
    </button>
  );
}
