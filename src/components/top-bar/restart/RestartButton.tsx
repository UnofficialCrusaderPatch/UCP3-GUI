import { useTranslation } from 'react-i18next';
import { relaunch } from '@tauri-apps/api/process';

import './RestartButton.css';

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
