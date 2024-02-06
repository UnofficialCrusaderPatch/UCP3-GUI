import { Accordion, Form } from 'react-bootstrap';

import { useMemo, useRef, useState } from 'react';

import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';

import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

import {
  DisplayConfigElement,
  UCP2SliderChoiceContents,
  UCP2SliderChoiceContent,
  UCP2SliderChoiceDisplayConfigElement,
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
import Logger, { ConsoleLogger } from '../../../../../util/scripts/logging';
import { parseEnabledLogic } from '../enabled-logic';

import { formatToolTip } from '../tooltips';
import { createStatusBarMessage } from './StatusBarMessage';
import { ConfigPopover } from './popover/ConfigPopover';

const LOGGER = new Logger('CreateUCP2SliderChoice.tsx');

function CreateUCP2SliderChoice(args: {
  spec: UCP2SliderChoiceDisplayConfigElement;
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
  const { url, text, tooltip, enabled, header, style } = spec;
  const { contents } = spec;
  const { choices } = contents as UCP2SliderChoiceContents;
  // (
  //   spec as DisplayConfigElement & {
  //     contents: {
  //       choices: {
  //         name: string;
  //         enabled: boolean;
  //         slider: number;
  //         min: number;
  //         max: number;
  //         step: number;
  //         text: string;
  //       }[];
  //     };
  //   }
  // ).contents;
  let { [url]: value } = configuration as {
    [url: string]: {
      enabled: boolean;
      choice: string;
      choices: { [choice: string]: { enabled: boolean; slider: number } };
    };
  };

  const { [url]: defaultValue } = configurationDefaults as {
    [url: string]: {
      enabled: boolean;
      choice: string;
      choices: { [choice: string]: { enabled: boolean; slider: number } };
    };
  };

  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );
  const fullToolTip = formatToolTip(tooltip, url);

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
      <div className="sword-checkbox d-flex align-items-center">
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

  const radios = choices.map((choice: UCP2SliderChoiceContent) => {
    const factor =
      1 /
      // eslint-disable-next-line no-nested-ternary
      (choice.step === undefined ? 1 : choice.step === 0 ? 1 : choice.step);
    const v =
      value.choices[choice.name].slider === undefined
        ? 0
        : (value.choices[choice.name].slider as number) * factor;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const localValueAtom = useMemo(() => atom(v), [v]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [localValue, setLocalValue] = useAtom(localValueAtom);

    const onClickRadio = (newValue: string) => {
      setUserConfiguration({
        type: 'set-multiple',
        value: Object.fromEntries([
          [url, { ...value, ...{ choice: newValue } }],
        ]),
      });
      setConfiguration({
        type: 'set-multiple',
        value: Object.fromEntries([
          [url, { ...value, ...{ choice: newValue } }],
        ]),
      });
      setConfigurationTouched({
        type: 'set-multiple',
        value: Object.fromEntries([[url, true]]),
      });
      configuration[url] = newValue;
    };

    return (
      // eslint-disable-next-line jsx-a11y/label-has-associated-control
      <div
        key={choice.name}
        className="form-check sword-checkbox"
        onMouseEnter={() => {
          setStatusBarMessage(statusBarMessage);
        }}
        onMouseLeave={() => {
          setStatusBarMessage(undefined);
        }}
        style={style}
      >
        <div>
          <input
            type="radio"
            className="form-check-input"
            name={choice.name}
            id={`${url}-radio-${choice.name}`}
            disabled={!value.enabled}
            checked={value.choice === choice.name}
            onClick={() => {
              onClickRadio(choice.name);
            }}
          />
          <label
            className="form-check-label"
            htmlFor={`${url}-radio-${choice.name}`}
          >
            {choice.text}
          </label>
        </div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <div className="col" style={{ marginLeft: 0, marginBottom: 0 }}>
          <div className="row">
            <div className="col-auto">
              <Form.Label
                disabled={
                  !isEnabled ||
                  disabled ||
                  !value.enabled ||
                  value.choice !== choice.name ||
                  isDisabled
                }
              >
                {choice.min}
              </Form.Label>
            </div>
            <div className="col-7">
              <Form.Range
                bsPrefix="ucp-slider"
                className="ucp-slider"
                min={choice.min * factor}
                max={choice.max * factor}
                step={choice.step * factor}
                id={`${url}-slider`}
                // size="sm"
                // variant="primary"
                value={localValue}
                // tooltipLabel={(currentValue) =>
                //  (currentValue / factor).toString()
                // }
                onMouseUp={() => {
                  const newValue = { ...value };
                  newValue.choices[choice.name].slider = localValue / factor;
                  setUserConfiguration({
                    type: 'set-multiple',
                    value: Object.fromEntries([[url, newValue]]),
                  });
                  setConfiguration({
                    type: 'set-multiple',
                    value: Object.fromEntries([[url, newValue]]),
                  });
                  setConfigurationTouched({
                    type: 'set-multiple',
                    value: Object.fromEntries([[url, true]]),
                  });
                }}
                onChange={(event) => {
                  const rawValue = parseFloat(event.target.value);
                  setLocalValue(rawValue);
                  ConsoleLogger.debug(localValue);
                }}
                disabled={
                  !isEnabled ||
                  disabled ||
                  !value.enabled ||
                  value.choice !== choice.name ||
                  isDisabled
                }
              />
            </div>
            <div className="col-1">
              <Form.Label
                disabled={
                  !isEnabled ||
                  disabled ||
                  !value.enabled ||
                  value.choice !== choice.name ||
                  isDisabled
                }
              >
                {choice.max}
              </Form.Label>
            </div>
            <div className="col-2">
              <Form.Control
                className="text-light fs-7 lh-1 text-end"
                key={`${url}-input`}
                style={{ backgroundColor: '#ab712d' }}
                type="number"
                min={choice.min as number}
                max={choice.max as number}
                step={choice.step}
                id={`${url}-input`}
                // Tooltip stuff
                data-bs-toggle="tooltip"
                data-bs-placement="top"
                title={fullToolTip}
                // End of tooltip stuff
                value={localValue / factor}
                onChange={(event) => {
                  ConsoleLogger.info(event);
                  const rawValue = parseFloat(event.target.value);
                  const newLocalValue = rawValue * factor;
                  setLocalValue(newLocalValue);
                  const newValue = { ...value };
                  newValue.choices[choice.name].slider = rawValue;
                  setUserConfiguration({
                    type: 'set-multiple',
                    value: Object.fromEntries([[url, newValue]]),
                  });
                  setConfiguration({
                    type: 'set-multiple',
                    value: Object.fromEntries([[url, newValue]]),
                  });
                  setConfigurationTouched({
                    type: 'set-multiple',
                    value: Object.fromEntries([[url, true]]),
                  });
                }}
                disabled={
                  !isEnabled ||
                  disabled ||
                  !value.enabled ||
                  value.choice !== choice.name ||
                  isDisabled
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  });

  const [showPopover, setShowPopover] = useState(false);
  const ref = useRef(null);

  return (
    <Accordion
      bsPrefix="ucp-accordion ui-element"
      className="sword-checkbox"
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
        <p>{text}</p>
        <div // Radiogroup
          className={isDisabled ? 'disabled' : ''}
        >
          {radios}
        </div>
      </Accordion.Body>
    </Accordion>
  );
}

export default CreateUCP2SliderChoice;
