import { useAtom, useSetAtom } from 'jotai';
import { PaletteFill, Palette } from 'react-bootstrap-icons';
import { CREATOR_MODE_ATOM } from '../../../../function/gui-settings/settings';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { useMessage } from '../../../general/message';

// eslint-disable-next-line import/prefer-default-export
export function CreatorModeButton() {
  const localize = useMessage();
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  const [guiCreatorMode, setGuiCreatorMode] = useAtom(CREATOR_MODE_ATOM);

  return (
    <button
      className="ucp-button"
      type="button"
      title={localize('config.mode.creator')}
      aria-label={localize('config.mode.creator')}
      aria-pressed={guiCreatorMode}
      onClick={() => {
        setGuiCreatorMode(!guiCreatorMode);
      }}
      onMouseEnter={() => {
        setStatusBarMessage('config.mode.creator');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {guiCreatorMode ? <PaletteFill /> : <Palette />}
    </button>
  );
}
