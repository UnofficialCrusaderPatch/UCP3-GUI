import { t } from 'i18next';
import { useAtom, useSetAtom } from 'jotai';
import { PaletteFill, Palette } from 'react-bootstrap-icons';
import { CREATOR_MODE_ATOM } from '../../../../function/gui-settings/settings';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';

// eslint-disable-next-line import/prefer-default-export
export function CreatorModeButton() {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  const [guiCreatorMode, setGuiCreatorMode] = useAtom(CREATOR_MODE_ATOM);

  return (
    <button
      className="ucp-button"
      type="button"
      onClick={() => {
        setGuiCreatorMode(!guiCreatorMode);
      }}
      onMouseEnter={() => {
        setStatusBarMessage(t('gui-editor:config.mode.creator'));
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {guiCreatorMode ? <PaletteFill /> : <Palette />}
    </button>
  );
}
