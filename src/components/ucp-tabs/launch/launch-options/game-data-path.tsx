import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { TrashFill } from 'react-bootstrap-icons';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import { showModalOk } from '../../../modals/modal-ok';
import { openFolderDialog } from '../../../../tauri/tauri-dialog';
import { LaunchOptions } from './launch-options';
import Text, { useText } from '../../../general/text';

interface GameDataPathMapping {
  date: number;
  gameFolder: string;
  gameDataPath: string;
}

const UCP_GAME_DATA_PATH_ARG = '--ucp-game-data-path';

const NUMBER_OF_PATH_MAPPINGS = 20;
const GAME_DATA_PATH_MAP_KEY = 'gameDataPathMap';
const GAME_DATA_PATH_MAP_STORAGE_ATOM = atomWithStorage(
  GAME_DATA_PATH_MAP_KEY,
  [] as GameDataPathMapping[],
);

function useGameDataStorageMap(
  currentFolder: string,
): [string | undefined, (path?: string) => void] {
  const [mappingArray, setMappingArray] = useAtom(
    GAME_DATA_PATH_MAP_STORAGE_ATOM,
  );

  const currentMappingIndex = mappingArray.findIndex(
    (value) => currentFolder === value.gameFolder,
  );
  const currentMapping =
    currentMappingIndex >= 0 ? mappingArray[currentMappingIndex] : undefined;
  const isRecent = currentMappingIndex === mappingArray.length - 1;

  return [
    currentMapping?.gameDataPath,
    (path?: string) => {
      if (!path) {
        if (currentMapping) {
          mappingArray.splice(currentMappingIndex, 1);
          setMappingArray([...mappingArray]);
        }
        return;
      }

      if (currentMapping) {
        currentMapping.gameDataPath = path;
        currentMapping.date = Date.now();
        if (!isRecent) {
          mappingArray.splice(currentMappingIndex, 1);
          mappingArray.push(currentMapping);
        }
        setMappingArray([...mappingArray]);
        return;
      }

      if (mappingArray.length + 1 > NUMBER_OF_PATH_MAPPINGS) {
        const removedMapping = mappingArray.shift();

        // no need to wait, is only confirm
        showModalOk({
          title: 'launch.options.game.data.path.gone.title',
          message: {
            key: 'launch.options.game.data.path.gone.message',
            args: {
              gameFolder: removedMapping?.gameFolder,
            },
          },
        });
      }
      mappingArray.push({
        date: Date.now(),
        gameFolder: currentFolder,
        gameDataPath: path,
      });
      setMappingArray([...mappingArray]);
    },
  ];
}

export default function GameDataPath({ getArgs, setArgs }: LaunchOptions) {
  const currentFolder = useCurrentGameFolder();
  const [currentGameDataPath, setGameDataPath] =
    useGameDataStorageMap(currentFolder);

  // needed for file interaction
  const localize = useText();

  const currentArgs = getArgs();
  const gamesDataPathArg = currentArgs.length > 0 ? currentArgs[1] : undefined;

  if (currentGameDataPath !== gamesDataPathArg) {
    setArgs(
      currentGameDataPath ? [UCP_GAME_DATA_PATH_ARG, currentGameDataPath] : [],
    );
  }

  return (
    <div className="launch__options__box--game-data-path">
      <h5>
        <Text message="launch.options.game.data.path" />
      </h5>
      <div>
        <input
          type="text"
          readOnly
          value={currentGameDataPath ?? ''}
          onClick={async () => {
            const configPath = await openFolderDialog(
              currentFolder,
              localize('launch.options.game.data.path.select.title'),
            );
            configPath.ifPresent(setGameDataPath);
          }}
        />
        <button type="button" onClick={() => setGameDataPath()}>
          <TrashFill />
        </button>
      </div>
    </div>
  );
}
