import { DisplayConfigElement } from 'config/ucp/common';

import {
  useConfigurationDefaults,
  useConfigurationLocks,
  useConfigurationReducer,
  useConfigurationSuggestions,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import { Form } from 'react-bootstrap';

import { useSetAtom } from 'jotai';
import { STATUS_BAR_MESSAGE_ATOM } from 'function/global/global-atoms';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';
import { createStatusBarMessage } from './StatusBarMessage';

function CreateSwitch(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useConfigurationReducer();
  const configurationWarnings = useConfigurationWarnings();
  const setConfigurationTouched = useSetConfigurationTouched();
  const configurationDefaults = useConfigurationDefaults();
  const configurationLocks = useConfigurationLocks();
  const configurationSuggestions = useConfigurationSuggestions();

  const { spec, disabled, className } = args;
  const { url, text, tooltip, enabled } = spec;
  const { [url]: value } = configuration;
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;

  const statusBarMessage = createStatusBarMessage(
    disabled,
    !isEnabled,
    configurationLocks[url] !== undefined,
    enabled,
    configurationLocks[url],
    configurationSuggestions[url] !== undefined,
    configurationSuggestions[url]
  );
  const isDisabled =
    disabled || !isEnabled || configurationLocks[url] !== undefined;

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  return (
    <div
      className={`d-flex align-items-baseline lh-sm my-1 ${className}`}
      onMouseEnter={() => {
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {hasWarning ? (
        <ConfigWarning
          text={configurationWarnings[url].text}
          level={configurationWarnings[url].level}
        />
      ) : null}
      <Form.Switch
        className=""
        // Tooltip stuff
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        title={fullToolTip}
        // End of tooltip stuff
        key={`${url}-switch`}
        label={text}
        id={`${url}-switch`}
        checked={value === undefined ? false : (value as boolean)}
        onChange={(event) => {
          setConfiguration({
            type: 'set-multiple',
            value: Object.fromEntries([[url, event.target.checked]]),
          });
          setConfigurationTouched({
            type: 'set-multiple',
            value: Object.fromEntries([[url, true]]),
          });
        }}
        disabled={isDisabled}
      />
    </div>
  );
}

export default CreateSwitch;
