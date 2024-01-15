import { Form } from 'react-bootstrap';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState, useRef } from 'react';
import {
  DisplayConfigElement,
  NumberContents,
} from '../../../../../config/ucp/common';

import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import {
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../function/configuration/state';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';
import { createStatusBarMessage } from './StatusBarMessage';
import { ConfigPopover } from './popover/ConfigPopover';

function CreateNumberInput(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useAtom(
    CONFIGURATION_FULL_REDUCER_ATOM,
  );
  const setUserConfiguration = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);
  const configurationWarnings = useAtomValue(
    CONFIGURATION_WARNINGS_REDUCER_ATOM,
  );
  const setConfigurationTouched = useSetAtom(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );
  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );
  const configurationLocks = useAtomValue(CONFIGURATION_LOCKS_REDUCER_ATOM);
  const configurationSuggestions = useAtomValue(
    CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
  );

  const { spec, disabled, className } = args;
  const { url, text, tooltip, enabled, contents } = spec;
  const { min, max } = contents as NumberContents;
  const { [url]: value } = configuration;
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
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
    configurationSuggestions[url],
  );
  const isDisabled =
    disabled || !isEnabled || configurationLocks[url] !== undefined;

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const [showPopover, setShowPopover] = useState(false);
  const ref = useRef(null);

  return (
    <Form.Group
      className={`d-flex align-items-baseline lh-sm config-number-group my-1 ${className}`}
      onMouseEnter={() => {
        setShowPopover(true);
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setShowPopover(false);
        setStatusBarMessage(undefined);
      }}
      ref={ref}
    >
      <ConfigPopover show={showPopover} url={url} theRef={ref} />
      {hasWarning ? (
        <ConfigWarning
          text={configurationWarnings[url].text}
          level={configurationWarnings[url].level}
        />
      ) : null}
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
      <div className="flex-grow-1" style={{ minWidth: '33%', maxWidth: '33%' }}>
        <Form.Control
          className="text-light fs-7 lh-1 text-end"
          key={`${url}-input`}
          style={{ backgroundColor: '#ab712d' }}
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
            setUserConfiguration({
              type: 'set-multiple',
              value: Object.fromEntries([
                [url, parseInt(event.target.value, 10)],
              ]),
            });
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
    </Form.Group>
  );
}

export default CreateNumberInput;
