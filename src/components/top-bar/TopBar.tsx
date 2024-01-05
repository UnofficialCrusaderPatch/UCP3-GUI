import CreditsButton from './credits/CreditsButton';
import { RestartButton } from './restart/RestartButton';
import LanguageSelect from './language-select/language-select';

import './TopBar.css';

// eslint-disable-next-line import/prefer-default-export
export function TopBar() {
  return (
    <div className="top-bar">
      <CreditsButton />
      <span className="mx-1" />
      <RestartButton />
      <LanguageSelect />
    </div>
  );
}
