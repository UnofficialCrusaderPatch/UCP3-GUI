import './game-starter.css';

import {
  EMPTY_GAME_VERSION,
  GameVersionInstance,
} from 'function/game-files/game-version';
import { Atom, useAtomValue } from 'jotai';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { osOpenProgram } from 'tauri/tauri-invoke';
import { ConsoleLogger } from 'util/scripts/logging';

interface GameStarterButtonProps {
  pathAtom: Atom<Promise<string>>;
  versionAtom: Atom<Promise<GameVersionInstance>>;
}

interface GameStarterProps extends GameStarterButtonProps {}

function GameStarterInfo(props: {
  versionAtom: Atom<Promise<GameVersionInstance>>;
}) {
  const { versionAtom } = props;

  const version = useAtomValue(versionAtom);

  return <>{version.toString()}</>;
}

function GameStarterButton(props: GameStarterProps) {
  const { pathAtom, versionAtom } = props;

  const { t } = useTranslation(['gui-launch']);

  const path = useAtomValue(pathAtom);
  const version = useAtomValue(versionAtom);

  const startDisabled = version === EMPTY_GAME_VERSION;

  return (
    <button
      type="button"
      className="ucp-button"
      onClick={() => osOpenProgram(path).catch(ConsoleLogger.error)} // needs better handling
      disabled={startDisabled}
    >
      {t('gui-launch:launch')}
    </button>
  );
}

export default function GameStarter(props: GameStarterProps) {
  const { pathAtom, versionAtom } = props;

  // TODO: better suspense
  return (
    <div className="flex-default game-starter__box">
      <img />
      <Suspense fallback="DUMMY">
        <GameStarterButton pathAtom={pathAtom} versionAtom={versionAtom} />
        <GameStarterInfo versionAtom={versionAtom} />
      </Suspense>
    </div>
  );
}
