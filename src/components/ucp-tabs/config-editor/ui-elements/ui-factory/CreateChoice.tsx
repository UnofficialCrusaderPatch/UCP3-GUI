import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Form } from 'react-bootstrap';
import { useState, useRef } from 'react';

import {
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../function/configuration/state';
import {
  ChoiceContents,
  ChoiceDisplayConfigElement,
} from '../../../../../config/ucp/common';

import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';

import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';
import { createStatusBarMessage } from './StatusBarMessage';
import { ConfigPopover } from './popover/ConfigPopover';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
} from '../../../../../function/configuration/derived-state';
import Logger from '../../../../../util/scripts/logging';

const LOGGER = new Logger('CreateChoice.tsx');

function CreateChoice(args: {
  spec: ChoiceDisplayConfigElement;
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
  const { choices } = contents as ChoiceContents;
  let { [url]: value } = configuration;
  const { [url]: defaultValue } = configurationDefaults;

  if (value === undefined) {
    LOGGER.msg(`value not defined (no default specified?) for: ${url}`).error();

    if (defaultValue === undefined) {
      const err = `value and default value not defined for: ${url}`;
      LOGGER.msg(err).error();
      throw Error(err);
    } else {
      LOGGER.msg(`default value for ${url}: {}`, defaultValue).debug();
      value = defaultValue;
    }
  }
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;
  const defaultChoice = choices[0].name;

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
      className={`d-flex align-items-baseline lh-sm config-number-group my-1 ui-element ${(spec.style || {}).className} ${className}`}
      onMouseEnter={() => {
        setShowPopover(true);
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setShowPopover(false);
        setStatusBarMessage(undefined);
      }}
      ref={ref}
      style={(spec.style || {}).css}
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
          // disabled={!isEnabled || disabled || configurationLocks[url] === true}
        >
          {text}
        </Form.Label>
      </div>
      <div className="flex-grow-1" style={{ minWidth: '33%', maxWidth: '33%' }}>
        <Form.Select
          size="sm"
          className="text-light fs-7 lh-1 form-control"
          style={{ backgroundColor: '#ab712d' }}
          key={`${url}-input`}
          id={`${url}-input`}
          // Tooltip stuff
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title={fullToolTip}
          // End of tooltip stuff
          value={value === undefined ? defaultChoice : (value as string)}
          onChange={(event) => {
            setUserConfiguration({
              type: 'set-multiple',
              value: Object.fromEntries([[url, event.target.value]]),
            });
            setConfiguration({
              type: 'set-multiple',
              value: Object.fromEntries([[url, event.target.value]]),
            });
            setConfigurationTouched({
              type: 'set-multiple',
              value: Object.fromEntries([[url, true]]),
            });
          }}
          disabled={isDisabled}
        >
          {choices.map((choice) => (
            <option key={`choice-${choice.name}`} value={choice.name}>
              {choice.text}
            </option>
          ))}
        </Form.Select>
      </div>
    </Form.Group>
  );
}

export default CreateChoice;
