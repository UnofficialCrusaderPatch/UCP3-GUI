import { t } from 'i18next';
import { useAtom, useSetAtom } from 'jotai';
import { GearFill, Gear } from 'react-bootstrap-icons';
import { CURRENT_DISPLAYED_TAB } from '../../tabs-state';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import * as GuiSettings from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export function CustomizeButton() {
  const [advancedMode, setAdvancedMode] = useAtom(
    GuiSettings.ADVANCED_MODE_ATOM,
  );

  const setCurrentTab = useSetAtom(CURRENT_DISPLAYED_TAB);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  return (
    <button
      type="button"
      className="ucp-button text-light"
      onClick={() => {
        const av = advancedMode;
        setAdvancedMode(!advancedMode);
        if (!av) {
          setCurrentTab('config');
        }
      }}
      onMouseEnter={() => {
        setStatusBarMessage(t('gui-editor:config.tooltip.customize'));
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <div className="ucp-button-variant-button-text">
        {advancedMode ? <GearFill /> : <Gear />}
        <span> {t('gui-editor:config.customize')}...</span>
      </div>
    </button>
  );
}
