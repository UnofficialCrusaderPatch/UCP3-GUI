import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { CheckCircleFill } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import { CONFIGURATION_TOUCHED_REDUCER_ATOM } from '../../../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { makeToast } from '../../../toasts/toasts-display';
import {
  CONFIG_DIRTY_STATE_ATOM,
  CONFIG_EXTENSIONS_DIRTY_STATE_ATOM,
} from './config-serialized-state';
import { EXTENSION_EDITOR_STATE_ATOM } from '../extension-editor/extension-editor-state';
import { editorApplyButtonCallback } from './editor-apply-button-callback';

function EditorApplyButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const [extensionsState, setExtensionsState] = useAtom(
    EXTENSION_STATE_REDUCER_ATOM,
  );

  const setConfigStatus = (msg: string) => makeToast({ title: msg, body: '' });

  const configurationDirtyState = useAtomValue(CONFIG_DIRTY_STATE_ATOM);
  const setDirtyState = useSetAtom(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM);

  const editorState = useAtomValue(EXTENSION_EDITOR_STATE_ATOM);

  const setConfigurationTouched = useSetAtom(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );

  // eslint-disable-next-line react/jsx-no-useless-fragment
  if (editorState.state !== 'active') return <></>;

  const { extension } = editorState;

  return (
    <button
      className="ucp-button ucp-button-variant"
      type="button"
      onMouseEnter={() => {
        setStatusBarMessage('config.tooltip.apply');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
      onClick={async () => {
        try {
          const result = await editorApplyButtonCallback(
            extensionsState,
            extension,
          );
          if (!result.apply) {
            return;
          }

          // Update state
          setConfigurationTouched({ type: 'clear-all' });

          setConfigStatus(`editor.saved`);

          setDirtyState(false);

          setExtensionsState(result.state);
        } catch (e: unknown) {
          await showModalOk({
            title: 'ERROR',
            message: String(e),
          });
        }
      }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <div className="ucp-button-variant-button-text d-flex align-items-center">
        {configurationDirtyState ? (
          <>
            <span style={{ paddingRight: '5px' }} />
            <span className="ms-auto pe-4">Save to extension *</span>
          </>
        ) : (
          <>
            <span style={{ paddingRight: '10px' }} />
            <CheckCircleFill className="" color="green" />{' '}
            <span className="ms-auto pe-4">Saved</span>
          </>
        )}
      </div>
    </button>
  );
}

export default EditorApplyButton;
