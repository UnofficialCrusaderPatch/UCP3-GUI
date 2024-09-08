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
import Text, { useText } from '../../../general/text';

const LOGGER = new Logger('game-starter.tsx');

interface GameStarterProps {
  pathAtom: Atom<Promise<string>>;
  versionAtom: Atom<Promise<GameVersionInstance>>;
  ucp2CheckAtom: Atom<Promise<boolean>>;
  imagePath: string;
  receiveArgs?: () => string[];
  receiveEnvs?: () => Record<string, string>;
  beforeLaunch?: () => void;
}

function GameStarterInfo(props: {
  versionAtom: Atom<Promise<GameVersionInstance>>;
}) {
  const { versionAtom } = props;

  const localize = useText();

  const version = useAtomValue(versionAtom);

  return (
    <table className="game-starter__info">
      <tbody>
        <tr className="game-starter__info__row">
          <td>
            <Text message="info.name" />
          </td>
          <td>:</td>
          <td>{version.name.getOrElse('')}</td>
        </tr>
        <tr className="game-starter__info__row">
          <td>
            <Text message="info.region" />
          </td>
          <td>:</td>
          <td>{version.region.getOrElse('')}</td>
        </tr>
        <tr className="game-starter__info__row">
          <td>
            <Text message="info.version" />
          </td>
          <td>:</td>
          <td>{`${version.getMajorAsString()}.${version.getMinorAsString()}.${version.getPatchAsString()}`}</td>
        </tr>
        <tr className="game-starter__info__row">
          <td>
            <Text message="info.sha" />
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
    imagePath,
    pathAtom,
    versionAtom,
    ucp2CheckAtom,
    receiveArgs,
    receiveEnvs,
    beforeLaunch,
  } = props;

  const localize = useText();

  const path = useAtomValue(pathAtom);
  const version = useAtomValue(versionAtom);
  const ucp2Present = useAtomValue(ucp2CheckAtom);

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
          title: 'Continue?',
          message:
            'There are changes in your config that have not been applied yet, hit Apply to apply them. You can find this button in the Content tab.\n\nContinue with starting the game without these changes?',
        });

        if (!answer) return;
      }

      setStarting(true);
      await osOpenProgram(path, receiveArgs?.(), receiveEnvs?.());
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
        <GameStarterInfo versionAtom={versionAtom} />
        <GameStarterButton
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
