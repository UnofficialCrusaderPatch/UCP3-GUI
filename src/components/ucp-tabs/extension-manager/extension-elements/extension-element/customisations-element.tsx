import { useSetAtom, useAtom } from 'jotai';
import { TrashFill } from 'react-bootstrap-icons';
import { CONFIGURATION_USER_REDUCER_ATOM } from '../../../../../function/configuration/state';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../../function/extensions/state/state';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import Message from '../../../../general/message';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../common/buttons/config-serialized-state';

// eslint-disable-next-line import/prefer-default-export
export function CustomisationsExtensionElement() {
  const setUserConfig = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const setDirty = useSetAtom(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM);

  const [extensionsState, setExtensionsState] = useAtom(
    EXTENSION_STATE_INTERFACE_ATOM,
  );

  const trashButton = (
    <button
      type="button"
      className="fs-8 disable-arrow-trash-button"
      onClick={() => {
        setUserConfig({ type: 'clear-all' });
        setDirty(true);
        setExtensionsState({ ...extensionsState });
      }}
      onPointerEnter={() => {
        setStatusBarMessage('extensions.extension.customisations.clear');
      }}
      onPointerLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <TrashFill />
    </button>
  );

  return (
    <div key="user-customisations" className="extension-element">
      {trashButton}
      <div className="extension-name-box">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <span className="extension-name-box__name">
          <Message message="extensions.customisations" />
        </span>
      </div>
    </div>
  );
}
