import { DisplayConfigElement } from 'config/ucp/common';

import {
  useConfigurationDefaults,
  useConfigurationLocks,
  useConfigurationReducer,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import { Form } from 'react-bootstrap';

import { useSetAtom } from 'jotai';
import { STATUS_BAR_MESSAGE_ATOM } from 'function/global/global-atoms';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';

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

  let disabledReason: string | undefined;
  let isDisabled = false;

  if (disabled) {
    isDisabled = true;
    disabledReason = `Can't change value because of a parent element`;
  } else if (!isEnabled) {
    isDisabled = true;
    disabledReason = `Can't change value because of ${enabled}`;
  } else if (configurationLocks[url] !== undefined) {
    isDisabled = true;
    disabledReason = `Can't change value because extension '${configurationLocks[url].lockedBy}' requires value ${configurationLocks[url].lockedValue}`;
  }

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  return (
    <div
      className={`d-flex align-items-baseline lh-sm my-1 ${className}`}
      onMouseEnter={() => {
        setStatusBarMessage(disabledReason);
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
