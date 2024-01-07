import './credits.css';

import { useTranslation } from 'react-i18next';

import { SaferMarkdown } from '../markdown/SaferMarkdown';
import { OverlayContentProps } from '../overlay/overlay';

// eslint-disable-next-line import/no-unresolved
import credits from './credits.md?raw';

// eslint-disable-next-line import/prefer-default-export
export function Credits(props: OverlayContentProps) {
  const { closeFunc } = props;

  const [t] = useTranslation(['gui-general', 'gui-landing']);

  return (
    <div className="credits-container">
      <h1 className="credits-title">{t('gui-landing:credits.title')}</h1>
      <div
        className="parchment-box credits-text-box"
        style={{ backgroundImage: '' }}
      >
        <div className="credits-text">
          <SaferMarkdown>{credits}</SaferMarkdown>
        </div>
      </div>
      <button
        type="button"
        className="ucp-button credits-close"
        onClick={closeFunc}
      >
        {t('gui-general:close')}
      </button>
    </div>
  );
}
