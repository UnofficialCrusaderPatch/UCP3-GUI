import { useTranslation } from 'react-i18next';

import './RestartButton.css';
import { relaunch } from '@tauri-apps/api/process';

// eslint-disable-next-line import/prefer-default-export
export function RestartButton() {
  const [t] = useTranslation(['gui-landing']);
  return (
    <button
      type="button"
      className="restart-button"
      onClick={async () => {
        await relaunch();
      }}
    >
      {t('gui-landing:restart')}
    </button>
  );
}
