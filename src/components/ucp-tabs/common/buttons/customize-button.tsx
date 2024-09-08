import { useAtom, useSetAtom } from 'jotai';
import { GearFill, Gear } from 'react-bootstrap-icons';
import { CURRENT_DISPLAYED_TAB } from '../../tabs-state';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import * as GuiSettings from '../../../../function/gui-settings/settings';
import Text from '../../../general/text';

// eslint-disable-next-line import/prefer-default-export
export function CustomizeButton() {
  const [advancedMode, setAdvancedMode] = useAtom(
    GuiSettings.ADVANCED_MODE_ATOM,
  );

  const setCreatorMode = useSetAtom(GuiSettings.CREATOR_MODE_ATOM);

  const setCurrentTab = useSetAtom(CURRENT_DISPLAYED_TAB);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  return (
    <button
      type="button"
      className="ucp-button h-100"
      onClick={() => {
        const av = advancedMode;
        const newAv = !av;
        if (av) {
          setCreatorMode(false);
        }
        setAdvancedMode(newAv);
        if (!av) {
          setCurrentTab('config');
        }
      }}
      onMouseEnter={() => {
        setStatusBarMessage('config.tooltip.customize');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <div className="ucp-button-variant-button-text d-flex align-items-center">
        <span className="me-1">{advancedMode ? <GearFill /> : <Gear />}</span>
        <span>
          <Text message="config.customize" />
          ...
        </span>
      </div>
    </button>
  );
}
