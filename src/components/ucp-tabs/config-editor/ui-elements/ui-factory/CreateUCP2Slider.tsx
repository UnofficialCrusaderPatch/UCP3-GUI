import { Accordion, Form } from 'react-bootstrap';

import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';

import { useMemo, useRef, useState } from 'react';

import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

import {
  NumberContents,
  DisplayConfigElement,
  UCP2SliderDisplayConfigElement,
} from '../../../../../config/ucp/common';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../function/configuration/state';
import Logger from '../../../../../util/scripts/logging';
import { parseEnabledLogic } from '../enabled-logic';

import { formatToolTip } from '../tooltips';
import { createStatusBarMessage } from './StatusBarMessage';
import { ConfigPopover } from './popover/ConfigPopover';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
} from '../../../../../function/configuration/derived-state';

const LOGGER = new Logger('CreateUCP2Slider.tsx');

export type UCP2SliderValue = { enabled: boolean; sliderValue: number };

function CreateUCP2Slider(args: {
  spec: UCP2SliderDisplayConfigElement;
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
  const { url, text, tooltip, enabled, header } = spec;
  const { contents } = spec;
  const { min, max, step } = contents as NumberContents;
  let { [url]: value } = configuration as {
    [url: string]: UCP2SliderValue;
  };
  const { [url]: defaultValue } = configurationDefaults as {
    [url: string]: UCP2SliderValue;
  };
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );
  const fullToolTip = formatToolTip(tooltip, url);

  // const hasWarning = configurationWarnings[url] !== undefined;
  const { hasHeader } = spec as DisplayConfigElement & {
    hasHeader: boolean;
  };

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
  // eslint-disable-next-line no-nested-ternary
  const factor = 1 / (step === undefined ? 1 : step === 0 ? 1 : step);

  const v =
    value.sliderValue === undefined
      ? 0
      : (value.sliderValue as number) * factor;
  const localValueAtom = useMemo(() => atom(v), [v]);

  const [localValue, setLocalValue] = useAtom(localValueAtom);

  const [showPopover, setShowPopover] = useState(false);
  const ref = useRef(null);

  return (
    <Accordion
      bsPrefix="ucp-accordion ui-element"
      className={`sword-checkbox ${(spec.style || {}).className}`}
      style={{ marginLeft: 0, marginBottom: 0, ...(spec.style || {}).css }}
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
      <Accordion.Header
        bsPrefix="ucp-accordion-header ucp-accordion-header-left-button"
        as="div"
      >
        {headerElement}
      </Accordion.Header>
      <Accordion.Body>
        <div>
          <label className="form-check-label" htmlFor={`${url}-slider`}>
            {!hasHeader && header}
            {text}
          </label>
        </div>
        <div className="row">
          <div className="col-auto">
            <Form.Label>{min}</Form.Label>
          </div>
          <div className="col col-6">
            <Form.Range
              bsPrefix="ucp-slider"
              className="ucp-slider"
              min={min * factor}
              max={max * factor}
              step={step * factor}
              id={`${url}-slider`}
              // size="sm"
              value={localValue}
              // tooltipLabel={(currentValue) => (currentValue / factor).toString()}
              onMouseUp={() => {
                const newValue = {
                  ...value,
                };
                newValue.sliderValue = localValue / factor;
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
                const newLocalValue = parseFloat(event.target.value);
                setLocalValue(newLocalValue);
              }}
              disabled={
                !isEnabled ||
                disabled ||
                !value.enabled ||
                configurationLocks[url] !== undefined
              }
            />
          </div>

          <div className="col-auto">
            <Form.Label>{max}</Form.Label>
          </div>
          <div className="col-2">
            <Form.Control
              className="text-light fs-7 lh-1 text-end"
              key={`${url}-input`}
              style={{ backgroundColor: '#ab712d' }}
              type="number"
              min={min}
              max={max}
              step={step}
              id={`${url}-input`}
              // Tooltip stuff
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title={fullToolTip}
              // End of tooltip stuff
              value={localValue / factor}
              onChange={(event) => {
                const rawValue = parseFloat(event.target.value);
                const newLocalValue = rawValue * factor;
                setLocalValue(newLocalValue);
                setConfiguration({
                  type: 'set-multiple',
                  value: Object.fromEntries([
                    [
                      url,
                      {
                        ...value,
                        ...{
                          sliderValue: rawValue,
                        },
                      },
                    ],
                  ]),
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
                configurationLocks[url] !== undefined
              }
            />
          </div>
        </div>
      </Accordion.Body>
    </Accordion>
  );
}

export default CreateUCP2Slider;
