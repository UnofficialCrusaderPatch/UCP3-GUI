import './launch.css';

import { useTranslation } from 'react-i18next';

import GameStarter from 'components/game-starter/game-starter';
import {
  EXTREME_PATH_ATOM,
  VANILLA_PATH_ATOM,
} from 'function/game-files/game-path';
import {
  EXTREME_VERSION_ATOM,
  VANILLA_VERSION_ATOM,
} from 'function/game-files/game-version-state';

export default function Launch() {
  const { t } = useTranslation(['gui-launch']);

  return (
    <div className="launch__container flex-default">
      <div className="launch__boxes">
        <GameStarter
          imagePath="src/assets/game-assets/logo-crusader-vanilla.png"
          pathAtom={VANILLA_PATH_ATOM}
          versionAtom={VANILLA_VERSION_ATOM}
        />
        <GameStarter
          imagePath="src/assets/game-assets/logo-crusader-extreme.png"
          pathAtom={EXTREME_PATH_ATOM}
          versionAtom={EXTREME_VERSION_ATOM}
        />
      </div>
      <div className="flex-default launch__options">
        <h4>{t('gui-launch:launch.options')}</h4>
        <div className="parchment-box launch__options__box" />
      </div>
    </div>
  );
}
