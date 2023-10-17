import { GameVersionInstance } from 'function/game-files/game-version';
import { Atom, useAtomValue } from 'jotai';
import { Suspense } from 'react';

interface GameStarterProps {
  versionAtom: Atom<Promise<GameVersionInstance>>;
}

function GameStarterButton(props: GameStarterProps) {
  const { versionAtom } = props;
  const version = useAtomValue(versionAtom);
  return <button type="button">{version.toString()}</button>;
}

export default function GameStarter(props: GameStarterProps) {
  const { versionAtom } = props;

  // TODO: better suspense
  return (
    <Suspense fallback="DUMMY">
      <GameStarterButton versionAtom={versionAtom} />
    </Suspense>
  );
}
