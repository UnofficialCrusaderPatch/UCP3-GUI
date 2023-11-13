/* eslint-disable react/require-default-props */
import './game-starter.css';

import {
  EMPTY_GAME_VERSION,
  GameVersionInstance,
} from 'function/game-files/game-version';
import { Atom, useAtomValue } from 'jotai';
import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { osOpenProgram } from 'tauri/tauri-invoke';
import Logger from 'util/scripts/logging';

const LOGGER = new Logger('game-starter.tsx');

interface GameStarterProps {
  pathAtom: Atom<Promise<string>>;
  versionAtom: Atom<Promise<GameVersionInstance>>;
  imagePath: string;
  args?: string[];
  envs?: Record<string, string>;
}

function GameStarterInfo(props: {
  versionAtom: Atom<Promise<GameVersionInstance>>;
}) {
  const { versionAtom } = props;

  const version = useAtomValue(versionAtom);

  return <>{version.toString()}</>;
}

function GameStarterButton(props: GameStarterProps) {
  const { imagePath, pathAtom, versionAtom, args, envs } = props;

  const { t } = useTranslation(['gui-launch']);

  const path = useAtomValue(pathAtom);
  const version = useAtomValue(versionAtom);

  const [starting, setStarting] = useState(false);

  const startDisabled = version === EMPTY_GAME_VERSION;

  const classes = ['game-starter__image'];
  if (startDisabled) {
    classes.push('game-starter__image--disabled');
  }
  if (starting) {
    classes.push('game-starter__image--starting');
  }

  const startFunc = async () => {
    try {
      setStarting(true);
      await osOpenProgram(path, args, envs);
    } catch (e) {
      // change handling?
      LOGGER.msg('Error while trying to launch "{}": {}', path, e).error();
    } finally {
      setStarting(false);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <img
      src={imagePath}
      className={classes.join(' ')}
      alt={t('gui-launch:launch')}
      onClick={startFunc}
    />
  );
}

export default function GameStarter(props: GameStarterProps) {
  const { imagePath, pathAtom, versionAtom, args, envs } = props;

  return (
    <div className="flex-default game-starter__box">
      <Suspense>
        <GameStarterButton
          imagePath={imagePath}
          pathAtom={pathAtom}
          versionAtom={versionAtom}
          args={args}
          envs={envs}
        />
        <GameStarterInfo versionAtom={versionAtom} />
      </Suspense>
    </div>
  );
}
