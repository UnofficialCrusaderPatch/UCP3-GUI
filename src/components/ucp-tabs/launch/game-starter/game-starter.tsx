/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable react/require-default-props */
import './game-starter.css';

import { Atom, useAtomValue } from 'jotai';
import { Suspense, useState } from 'react';
import { osOpenProgram } from '../../../../tauri/tauri-invoke';
import {
  EMPTY_GAME_VERSION,
  GameVersionInstance,
} from '../../../../function/game-files/game-version';
import { showModalOk } from '../../../modals/modal-ok';
import Logger from '../../../../util/scripts/logging';
import { sleep } from '../../../../util/scripts/util';
import { CONFIG_DIRTY_STATE_ATOM } from '../../common/buttons/config-serialized-state';
import { FIRST_TIME_USE_ATOM } from '../../../../function/gui-settings/settings';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import Message, { useMessage } from '../../../general/message';
import { GameDataWrapper } from '../../../../function/game-files/game-data';

const LOGGER = new Logger('game-starter.tsx');

interface GameStarterProps {
  exeType: keyof GameDataWrapper<never>;
  pathAtom: Atom<Promise<GameDataWrapper<string>>>;
  versionAtom: Atom<Promise<GameDataWrapper<GameVersionInstance>>>;
  ucp2CheckAtom: Atom<Promise<GameDataWrapper<boolean>>>;
  imagePath: string;
  receiveArgs?: () => string[];
  receiveEnvs?: () => Record<string, string>;
  beforeLaunch?: () => void;
}

function GameStarterInfo(props: {
  exeType: keyof GameDataWrapper<never>;
  versionAtom: Atom<Promise<GameDataWrapper<GameVersionInstance>>>;
}) {
  const { exeType, versionAtom } = props;

  const localize = useMessage();

  const version = useAtomValue(versionAtom)[exeType];

  return (
    <table className="game-starter__info">
      <tbody>
        <tr className="game-starter__info__row">
          <td>
            <Message message="info.name" />
          </td>
          <td>:</td>
          <td>{version.name.getOrElse('')}</td>
        </tr>
        <tr className="game-starter__info__row">
          <td>
            <Message message="info.region" />
          </td>
          <td>:</td>
          <td>{version.region.getOrElse('')}</td>
        </tr>
        <tr className="game-starter__info__row">
          <td>
            <Message message="info.version" />
          </td>
          <td>:</td>
          <td>{`${version.getMajorAsString()}.${version.getMinorAsString()}.${version.getPatchAsString()}`}</td>
        </tr>
        <tr className="game-starter__info__row">
          <td>
            <Message message="info.sha" />
          </td>
          <td>:</td>
          <td>
            <button
              type="button"
              title={localize('info.sha.copy')}
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
  const {
    exeType,
    imagePath,
    pathAtom,
    versionAtom,
    ucp2CheckAtom,
    receiveArgs,
    receiveEnvs,
    beforeLaunch,
  } = props;

  const localize = useMessage();

  const path = useAtomValue(pathAtom)[exeType];
  const version = useAtomValue(versionAtom)[exeType];
  const ucp2Present = useAtomValue(ucp2CheckAtom)[exeType];

  const [starting, setStarting] = useState(false);

  const startDisabled = ucp2Present || version === EMPTY_GAME_VERSION;

  let cssClass = 'game-starter__starter';
  if (startDisabled) {
    cssClass = 'game-starter__starter--disabled';
  } else if (starting) {
    cssClass = 'game-starter__starter--starting';
  }

  const dirty = useAtomValue(CONFIG_DIRTY_STATE_ATOM);
  const firstTimeUse = useAtomValue(FIRST_TIME_USE_ATOM);

  const startFunc = async () => {
    if (beforeLaunch !== undefined) beforeLaunch();
    try {
      if (dirty && firstTimeUse) {
        const answer = await showModalOkCancel({
          title: 'launch.unsaved.continue',
          message: 'launch.unsaved.warning',
        });

        if (!answer) return;
      }

      setStarting(true);
      const p = path.valueOf();
      const args = receiveArgs?.();
      const envs = receiveEnvs?.();

      LOGGER.msg(
        `Launching program: ${p} ${args?.join(' ')} with env variables:\n${JSON.stringify(envs, undefined, 2)}`,
      ).info();
      await osOpenProgram(p, args, envs);
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
      <img src={imagePath} alt={localize('launch')} />
    </>
  );
}

export default function GameStarter(props: GameStarterProps) {
  const {
    exeType,
    imagePath,
    pathAtom,
    versionAtom,
    ucp2CheckAtom,
    receiveArgs,
    receiveEnvs,
    beforeLaunch,
  } = props;

  return (
    <div className="flex-default game-starter__box">
      <Suspense>
        <GameStarterInfo exeType={exeType} versionAtom={versionAtom} />
        <GameStarterButton
          exeType={exeType}
          imagePath={imagePath}
          pathAtom={pathAtom}
          versionAtom={versionAtom}
          ucp2CheckAtom={ucp2CheckAtom}
          receiveArgs={receiveArgs}
          receiveEnvs={receiveEnvs}
          beforeLaunch={beforeLaunch}
        />
      </Suspense>
    </div>
  );
}
