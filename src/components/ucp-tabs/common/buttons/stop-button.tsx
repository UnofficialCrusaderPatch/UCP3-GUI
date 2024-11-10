import { useSetAtom } from 'jotai';
import { EXTENSION_EDITOR_STATE_ATOM } from '../extension-editor/extension-editor-state';
import importButtonCallback from '../importing/import-button-callback';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import { showModalOk } from '../../../modals/modal-ok';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from './config-serialized-state';
import Message, { useMessage } from '../../../general/message';

// eslint-disable-next-line import/prefer-default-export
export function StopButton() {
  const setEditorState = useSetAtom(EXTENSION_EDITOR_STATE_ATOM);

  const gameFolder = useCurrentGameFolder();

  const setDirty = useSetAtom(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM);

  const localize = useMessage();
  return (
    <button
      className="ucp-button ucp-button-variant"
      type="button"
      onClick={async () => {
        try {
          await importButtonCallback(
            gameFolder,
            () => {},
            localize,
            `${gameFolder}/ucp-config.yml`,
          );

          setEditorState({ state: 'inactive' });

          setDirty(true);
        } catch (err: unknown) {
          await showModalOk({
            title: 'ERROR',
            message: String(err),
          });
        }
      }}
    >
      <Message message="extensions.extension.customisations.stop" />
    </button>
  );
}
