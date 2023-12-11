/* eslint-disable react/jsx-props-no-spreading */
import './launch.css';
import './launch-options/launch-options.css'; // currently imported here, als long as single files not needed

import { useTranslation } from 'react-i18next';
import GameStarter from 'components/ucp-tabs/launch/game-starter/game-starter';
import {
  EXTREME_PATH_ATOM,
  VANILLA_PATH_ATOM,
} from 'function/game-files/game-path';
import {
  EXTREME_VERSION_ATOM,
  VANILLA_VERSION_ATOM,
} from 'function/game-files/game-version-state';
import { useRef } from 'react';

import logoCrusaderExtreme from '../../../assets/game-assets/logo-crusader-extreme.png';
import logoCrusaderVanilla from '../../../assets/game-assets/logo-crusader-vanilla.png';
import { createLaunchOptionFuncs } from './launch-options/launch-options';
import FreeArgs from './launch-options/free-args';
import FreeEnvs from './launch-options/free-envs';

export default function Launch() {
  const internalArgs = useRef<Record<string, string[]>>({}).current;
  const internalEnvs = useRef<Record<string, Record<string, string>>>(
    {},
  ).current;

  const { t } = useTranslation(['gui-launch']);

  const receiveArgs = () => Object.values(internalArgs).flat();
  const receiveEnvs = () => Object.assign({}, ...Object.values(internalEnvs));

  return (
    <div className="launch__container flex-default">
      <div className="launch__boxes">
        <GameStarter
          imagePath={logoCrusaderVanilla}
          pathAtom={VANILLA_PATH_ATOM}
          versionAtom={VANILLA_VERSION_ATOM}
          receiveArgs={receiveArgs}
          receiveEnvs={receiveEnvs}
        />
        <GameStarter
          imagePath={logoCrusaderExtreme}
          pathAtom={EXTREME_PATH_ATOM}
          versionAtom={EXTREME_VERSION_ATOM}
          receiveArgs={receiveArgs}
          receiveEnvs={receiveEnvs}
        />
      </div>
      <div className="flex-default launch__options">
        <h4>{t('gui-launch:launch.options')}</h4>
        <div className="parchment-box launch__options__box">
          <FreeArgs
            {...createLaunchOptionFuncs(
              'FREE_ARGS',
              internalArgs,
              internalEnvs,
            )}
          />
          <FreeEnvs
            {...createLaunchOptionFuncs(
              'FREE_ENVS',
              internalArgs,
              internalEnvs,
            )}
          />
        </div>
      </div>
    </div>
  );
}
