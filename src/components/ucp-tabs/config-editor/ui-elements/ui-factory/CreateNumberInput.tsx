import { DisplayConfigElement, NumberContents } from 'config/ucp/common';
import {
  useConfigurationDefaults,
  useConfigurationLocks,
  useConfigurationReducer,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import { Form } from 'react-bootstrap';
import { STATUS_BAR_MESSAGE_ATOM } from 'function/global/global-atoms';
import { useSetAtom } from 'jotai';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';

function CreateNumberInput(args: {
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
  const { url, text, tooltip, enabled, contents } = spec;
  const { min, max } = contents as NumberContents;
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
    <Form.Group
      className={`d-flex align-items-baseline lh-sm config-number-group my-1 ${className}`}
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
      <div className="col-1 mr-3">
        <Form.Control
          className="bg-dark text-light fs-7 lh-1"
          key={`${url}-input`}
          type="number"
          min={min as number}
          max={max as number}
          id={`${url}-input`}
          // Tooltip stuff
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title={fullToolTip}
          // End of tooltip stuff
          value={value === undefined ? 0 : (value as number)}
          onChange={(event) => {
            setConfiguration({
              type: 'set-multiple',
              value: Object.fromEntries([
                [url, parseInt(event.target.value, 10)],
              ]),
            });
            setConfigurationTouched({
              type: 'set-multiple',
              value: Object.fromEntries([[url, true]]),
            });
          }}
          disabled={isDisabled}
        />
      </div>
      <div className={`flex-grow-1 px-2 ${isDisabled ? 'label-disabled' : ''}`}>
        <Form.Label
          htmlFor={`${url}-input`}
          // Tooltip stuff
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title={fullToolTip}
          // End of tooltip stuff
          // disabled={!isEnabled || disabled}
        >
          {text}
        </Form.Label>
      </div>
    </Form.Group>
  );
}

export default CreateNumberInput;
