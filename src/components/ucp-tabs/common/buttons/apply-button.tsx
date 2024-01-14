import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import {
  UCP_CONFIG_FILE_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { makeToast } from '../../../modals/toasts/toasts-display';
import saveConfig from '../save-config';

function ApplyButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const file = useAtomValue(UCP_CONFIG_FILE_ATOM);
  const userConfiguration = useAtomValue(CONFIGURATION_USER_REDUCER_ATOM);
  const configuration = useAtomValue(CONFIGURATION_FULL_REDUCER_ATOM);
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);
  const { activeExtensions } = extensionsState;

  const configurationQualifier = useAtomValue(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  );

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const setConfigStatus = (msg: string) => makeToast({ title: msg, body: '' });

  return (
    <button
      className="ucp-button ucp-button-variant"
      type="button"
      onMouseEnter={() => {
        setStatusBarMessage(t('gui-editor:config.tooltip.apply'));
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
      onClick={async () => {
        try {
          const result: string = await saveConfig(
            configuration,
            userConfiguration,
            file, // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`,
            extensionsState.explicitlyActivatedExtensions,
            activeExtensions,
            configurationQualifier,
          );
          setConfigStatus(result);
        } catch (e: any) {
          await showModalOk({
            title: 'ERROR',
            message: e.toString(),
          });
        }
      }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <div className="ucp-button-variant-button-text">
        {t('gui-general:apply')}
      </div>
    </button>
  );
}

export default ApplyButton;
