/* eslint-disable react/require-default-props */
import './game-starter.css';

import { showModalOk } from 'components/modals/modal-ok';
import {
  EMPTY_GAME_VERSION,
  GameVersionInstance,
} from 'function/game-files/game-version';
import { Atom, useAtomValue } from 'jotai';
import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { osOpenProgram } from 'tauri/tauri-invoke';
import Logger from 'util/scripts/logging';
import { sleep } from 'util/scripts/util';

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

  const { t } = useTranslation(['gui-launch']);

  const version = useAtomValue(versionAtom);

  return (
    <div className="flex-default game-starter__info">
      <div className="game-starter__info__row">
        <div>{t('gui-launch:info.name')}</div>
        <div>:</div>
        <div>{version.name.getOrElse('')}</div>
      </div>
      <div className="game-starter__info__row">
        <div>{t('gui-launch:info.region')}</div>
        <div>:</div>
        <div>{version.region.getOrElse('')}</div>
      </div>
      <div className="game-starter__info__row">
        <div>{t('gui-launch:info.version')}</div>
        <div>:</div>
        <div>{`${version.getMajorAsString()}.${version.getMinorAsString()}.${version.getPatchAsString()}`}</div>
      </div>
      <div className="game-starter__info__row">
        <div>{t('gui-launch:info.sha')}</div>
        <div>:</div>
        <div>
          <button
            type="button"
            title={t('gui-launch:info.sha.copy')}
            onClick={() =>
              navigator.clipboard
                .writeText(version.sha)
                .catch(async (reason) => {
                  LOGGER.obj(reason).warn();
                  await showModalOk({
                    title: 'WARNING',
                    message: reason,
                  });
                })
            }
          >
            {version.getShaRepresentation()}
          </button>
        </div>
      </div>
    </div>
  );
}

function GameStarterButton(props: GameStarterProps) {
  const { imagePath, pathAtom, versionAtom, args, envs } = props;

  const { t } = useTranslation(['gui-launch']);

  const path = useAtomValue(pathAtom);
  const version = useAtomValue(versionAtom);

  const [starting, setStarting] = useState(false);

  const startDisabled = version === EMPTY_GAME_VERSION;

  let cssClass = 'game-starter__image';
  if (startDisabled) {
    cssClass = 'game-starter__image--disabled';
  } else if (starting) {
    cssClass = 'game-starter__image--starting';
  }

  const startFunc = async () => {
    try {
      setStarting(true);
      await osOpenProgram(path, args, envs);
      // the game start takes a while, but we not observe it, so we simulate loading a bit instead
      await sleep(2000);
    } catch (e) {
      const msg = `Error while trying to launch "${path}": ${e}`;
      LOGGER.msg(msg).error();
      await showModalOk({
        title: 'ERROR',
        message: msg,
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <img
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={startDisabled ? undefined : 0}
      src={imagePath}
      className={cssClass}
      alt={t('gui-launch:launch')}
      onClick={startDisabled || starting ? undefined : startFunc}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') {
          return;
        }
        (event.target as HTMLImageElement).click();
      }}
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
