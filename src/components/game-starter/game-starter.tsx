import { Console } from 'console';
import {
  EMPTY_GAME_VERSION,
  GameVersionInstance,
} from 'function/game-files/game-version';
import { Atom, useAtomValue } from 'jotai';
import { Suspense } from 'react';
import { osOpenProgram } from 'tauri/tauri-invoke';
import { ConsoleLogger } from 'util/scripts/logging';

// TODO: Improve these components/design and error handling

interface GameStarterProps {
  pathAtom: Atom<Promise<string>>;
  versionAtom: Atom<Promise<Promise<GameVersionInstance>>>;
}

function GameStarterButton(props: GameStarterProps) {
  const { pathAtom, versionAtom } = props;
  const path = useAtomValue(pathAtom);
  const version = useAtomValue(versionAtom);

  const startDisabled = version === EMPTY_GAME_VERSION;

  return (
    <button
      type="button"
      onClick={() => osOpenProgram(path).catch(ConsoleLogger.error)} // needs better handling
      disabled={startDisabled}
    >
      {version.toString()}
    </button>
  );
}

export default function GameStarter(props: GameStarterProps) {
  const { pathAtom, versionAtom } = props;

  // TODO: better suspense
  return (
    <Suspense fallback="DUMMY">
      <GameStarterButton pathAtom={pathAtom} versionAtom={versionAtom} />
    </Suspense>
  );
}
