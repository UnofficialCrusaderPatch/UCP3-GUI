import { t } from 'i18next';
import { useSetAtom, useAtomValue } from 'jotai';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';

function ResetButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const setUserConfiguration = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);
  const setConfiguration = useSetAtom(CONFIGURATION_FULL_REDUCER_ATOM);
  const setConfigurationTouched = useSetAtom(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );

  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );
  return (
    <button
      className="ucp-button icons-button reset"
      type="button"
      onClick={() => {
        setUserConfiguration({
          type: 'reset',
          value: {},
        });
        setConfiguration({
          type: 'reset',
          value: configurationDefaults,
        });
        setConfigurationTouched({
          type: 'reset',
          value: {},
        });
      }}
      onMouseEnter={() => {
        setStatusBarMessage(t('gui-editor:config.tooltip.reset'));
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}

export default ResetButton;
