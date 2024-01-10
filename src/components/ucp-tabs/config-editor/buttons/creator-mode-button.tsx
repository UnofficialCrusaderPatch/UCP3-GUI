import { t } from 'i18next';
import { useAtom } from 'jotai';
import { GearFill, Gear } from 'react-bootstrap-icons';
import { CREATOR_MODE_ATOM } from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export function CreatorModeButton() {
  const [guiCreatorMode, setGuiCreatorMode] = useAtom(CREATOR_MODE_ATOM);

  return (
    <button
      className="ucp-button ucp-button-variant"
      type="button"
      onClick={() => {
        setGuiCreatorMode(!guiCreatorMode);
      }}
    >
      <div className="ucp-button-variant-button-text">
        <span className="mx-1">{guiCreatorMode ? <GearFill /> : <Gear />}</span>
        <span className="mx-1">{t('gui-editor:config.mode.creator')}</span>
      </div>
    </button>
  );
}
