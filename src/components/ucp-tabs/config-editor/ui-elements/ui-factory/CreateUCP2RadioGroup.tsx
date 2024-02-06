import { Accordion } from 'react-bootstrap';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState, useRef } from 'react';
import {
  ChoiceContents,
  DisplayConfigElement,
  UCP2RadioGroupDisplayConfigElement,
} from '../../../../../config/ucp/common';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import {
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../function/configuration/state';
import Logger from '../../../../../util/scripts/logging';
import { parseEnabledLogic } from '../enabled-logic';
import { createStatusBarMessage } from './StatusBarMessage';
import { ConfigPopover } from './popover/ConfigPopover';

const LOGGER = new Logger('CreateUCP2RadioGroup.tsx');

function CreateUCP2RadioGroup(args: {
  spec: UCP2RadioGroupDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useAtom(
    CONFIGURATION_FULL_REDUCER_ATOM,
  );
  const setUserConfiguration = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);
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

  const { spec, disabled } = args;
  const { url, text, enabled, header, style } = spec;
  const { contents } = spec;
  const { choices } = contents as ChoiceContents;
  let { [url]: value } = configuration as {
    [url: string]: { enabled: boolean; choice: string };
  };
  const { [url]: defaultValue } = configurationDefaults as {
    [url: string]: { enabled: boolean; choice: string };
  };
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );

  // const hasWarning = configurationWarnings[url] !== undefined;
  const { hasHeader } = spec as DisplayConfigElement & {
    hasHeader: boolean;
  };

  if (value === undefined) {
    LOGGER.msg(`value not defined (no default specified?) for: ${url}`).error();

    if (defaultValue === undefined) {
      LOGGER.msg(`default value not defined for: ${url}`).error();
    }

    LOGGER.msg(`default value for ${url}: {}`, defaultValue).debug();
    value = defaultValue;
  }

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

  // eslint-disable-next-line react/jsx-no-useless-fragment
  let headerElement = <></>;
  if (hasHeader) {
    headerElement = (
      <div className="sword-checkbox">
        <input
          type="checkbox"
          className="me-2"
          id={`${url}-header`}
          key={`${url}-header`}
          checked={
            value.enabled === undefined ? false : (value.enabled as boolean)
          }
          onChange={(event) => {
            setUserConfiguration({
              type: 'set-multiple',
              value: Object.fromEntries([
                [url, { ...value, ...{ enabled: event.target.checked } }],
              ]),
            });
            setConfiguration({
              type: 'set-multiple',
              value: Object.fromEntries([
                [url, { ...value, ...{ enabled: event.target.checked } }],
              ]),
            });
            setConfigurationTouched({
              type: 'set-multiple',
              value: Object.fromEntries([[url, true]]),
            });
          }}
          disabled={isDisabled}
        />
        <label className="fs-6" htmlFor={`${url}-header`}>
          {header}
        </label>
      </div>
    );
  }

  const [showPopover, setShowPopover] = useState(false);
  const ref = useRef(null);

  const onRadioClick = (newValue: string) => {
    setUserConfiguration({
      type: 'set-multiple',
      value: Object.fromEntries([[url, { ...value, ...{ choice: newValue } }]]),
    });
    setConfiguration({
      type: 'set-multiple',
      value: Object.fromEntries([[url, { ...value, ...{ choice: newValue } }]]),
    });
    setConfigurationTouched({
      type: 'set-multiple',
      value: Object.fromEntries([[url, true]]),
    });
    configuration[url] = newValue;
  };

  return (
    <Accordion
      bsPrefix="ucp-accordion ui-element"
      className="col sword-checkbox"
      style={{ marginLeft: 0, marginBottom: 0, ...style }}
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
      <Accordion.Header as="div">{headerElement}</Accordion.Header>
      <Accordion.Body>
        <div>
          <label className="form-check-label" htmlFor={`${url}-choice`}>
            {!hasHeader && header}
            {text}
          </label>
        </div>
        <div className="row">
          <div className={!value.enabled || isDisabled ? 'disabled' : ''}>
            {choices.map((choice) => (
              // eslint-disable-next-line jsx-a11y/label-has-associated-control
              <div key={choice.name} className="form-check sword-checkbox">
                <input
                  type="radio"
                  className="form-check-input"
                  checked={choice.name === value.choice}
                  onClick={() => {
                    onRadioClick(choice.name);
                  }}
                  id={`${url}-radio-${choice.name}`}
                  disabled={!value.enabled || isDisabled}
                />
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label
                  className="form-check-label"
                  htmlFor={`${url}-radio-${choice.name}`}
                >
                  {choice.text}
                </label>
                {choice.subtext === undefined ? (
                  // eslint-disable-next-line react/jsx-no-useless-fragment
                  <></>
                ) : (
                  <div className="fs-8">{choice.subtext}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Accordion.Body>
    </Accordion>
  );
}

export default CreateUCP2RadioGroup;
