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
  receiveArgs?: () => string[];
  receiveEnvs?: () => Record<string, string>;
}

function GameStarterInfo(props: {
  versionAtom: Atom<Promise<GameVersionInstance>>;
}) {
  const { versionAtom } = props;

  const { t } = useTranslation(['gui-launch']);

  const version = useAtomValue(versionAtom);

  return (
    <table className="game-starter__info">
      <tbody>
        <tr className="game-starter__info__row">
          <td>{t('gui-launch:info.name')}</td>
          <td>:</td>
          <td>{version.name.getOrElse('')}</td>
        </tr>
        <tr className="game-starter__info__row">
          <td>{t('gui-launch:info.region')}</td>
          <td>:</td>
          <td>{version.region.getOrElse('')}</td>
        </tr>
        <tr className="game-starter__info__row">
          <td>{t('gui-launch:info.version')}</td>
          <td>:</td>
          <td>{`${version.getMajorAsString()}.${version.getMinorAsString()}.${version.getPatchAsString()}`}</td>
        </tr>
        <tr className="game-starter__info__row">
          <td>{t('gui-launch:info.sha')}</td>
          <td>:</td>
          <td>
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
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function GameStarterButton(props: GameStarterProps) {
  const { imagePath, pathAtom, versionAtom, receiveArgs, receiveEnvs } = props;

  const { t } = useTranslation(['gui-launch']);

  const path = useAtomValue(pathAtom);
  const version = useAtomValue(versionAtom);

  const [starting, setStarting] = useState(false);

  const startDisabled = version === EMPTY_GAME_VERSION;

  let cssClass = 'game-starter__starter';
  if (startDisabled) {
    cssClass = 'game-starter__starter--disabled';
  } else if (starting) {
    cssClass = 'game-starter__starter--starting';
  }

  const preprocessedArgs =
    receiveArgs === undefined
      ? undefined
      : receiveArgs()
          .map((arg) => arg.split(' ', 2))
          .flat();

  const startFunc = async () => {
    try {
      setStarting(true);
      await osOpenProgram(path, preprocessedArgs, receiveEnvs?.());
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
    <>
      <button
        type="button"
        className={`ucp-button ${cssClass}`}
        disabled={startDisabled || starting}
        onClick={startDisabled || starting ? undefined : startFunc}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') {
            return;
          }
          (event.target as HTMLImageElement).click();
        }}
      >
        &#9654;
      </button>
      <hr />
      <img src={imagePath} alt={t('gui-launch:launch')} />
    </>
  );
}

export default function GameStarter(props: GameStarterProps) {
  const { imagePath, pathAtom, versionAtom, receiveArgs, receiveEnvs } = props;

  return (
    <div className="flex-default game-starter__box">
      <Suspense>
        <GameStarterInfo versionAtom={versionAtom} />
        <GameStarterButton
          imagePath={imagePath}
          pathAtom={pathAtom}
          versionAtom={versionAtom}
          receiveArgs={receiveArgs}
          receiveEnvs={receiveEnvs}
        />
      </Suspense>
    </div>
  );
}
