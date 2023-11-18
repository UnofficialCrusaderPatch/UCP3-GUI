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
import { useState } from 'react';
import ParchmentBox from 'components/general/parchment-box/parchment-box';

export default function Launch() {
  // might a bit inefficient, but should be enough for a game starter
  const [args, setArgs] = useState<Record<string, string[]>>({});
  const [envs, setEnvs] = useState<Record<string, string>>({});

  const { t } = useTranslation(['gui-launch']);

  const currentArgs = Object.values(args).flat();
  return (
    <div className="launch__container flex-default">
      <div className="launch__boxes">
        <GameStarter
          imagePath="src/assets/game-assets/logo-crusader-vanilla.png"
          pathAtom={VANILLA_PATH_ATOM}
          versionAtom={VANILLA_VERSION_ATOM}
          args={currentArgs}
          envs={envs}
        />
        <GameStarter
          imagePath="src/assets/game-assets/logo-crusader-extreme.png"
          pathAtom={EXTREME_PATH_ATOM}
          versionAtom={EXTREME_VERSION_ATOM}
          args={currentArgs}
          envs={envs}
        />
      </div>
      <div className="flex-default launch__options">
        <h4>{t('gui-launch:launch.options')}</h4>
        <ParchmentBox className="launch__options__box">
          {/* 
            Insert options that change start params or environment vars.
            Do not forget that setArgs and setEnvs need to be called with
            a new object to trigger change.
          */}
        </ParchmentBox>
      </div>
    </div>
  );
}
