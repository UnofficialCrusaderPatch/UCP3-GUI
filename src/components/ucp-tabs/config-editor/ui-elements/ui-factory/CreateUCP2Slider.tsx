import {
  useActiveExtensions,
  useConfigurationDefaults,
  useConfigurationReducer,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import {
  NumberContents,
  ChoiceContents,
  DisplayConfigElement,
} from 'config/ucp/common';

import { Form } from 'react-bootstrap';

import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import RangeSlider from 'react-bootstrap-range-slider';

import { useState } from 'react';

import { parseEnabledLogic } from '../enabled-logic';

import { formatToolTip } from '../tooltips';

function CreateUCP2Slider(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useConfigurationReducer();
  const configurationWarnings = useConfigurationWarnings();
  const setConfigurationTouched = useSetConfigurationTouched();
  const configurationDefaults = useConfigurationDefaults();

  const { spec, disabled, className } = args;
  const { url, text, tooltip, enabled, header } = spec;
  const { contents } = spec;
  const { min, max, step } = contents as NumberContents;
  let { [url]: value } = configuration as {
    [url: string]: { enabled: boolean; sliderValue: number };
  };
  const { [url]: defaultValue } = configurationDefaults as {
    [url: string]: { enabled: boolean; sliderValue: number };
  };
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;
  const { hasHeader } = spec as DisplayConfigElement & {
    hasHeader: boolean;
  };

  if (value === undefined) {
    console.error(`value not defined (no default specified?) for: ${url}`);

    if (defaultValue === undefined) {
      console.error(`default value not defined for: ${url}`);
    }

    console.log(`default value for ${url}:`);
    console.log(defaultValue);
    value = defaultValue;
  }

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
          disabled={!isEnabled || disabled}
        />
        <label className="fs-6" htmlFor={`${url}-header`}>
          {header}
        </label>
      </div>
    );
  }
  // eslint-disable-next-line no-nested-ternary
  const factor = 1 / (step === undefined ? 1 : step === 0 ? 1 : step);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [localValue, setLocalValue] = useState(
    value.sliderValue === undefined ? 0 : (value.sliderValue as number) * factor
  );
  return (
    <div className="sword-checkbox test123" style={{ marginLeft: 0, marginBottom: 0 }}>
      {headerElement}
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
          <RangeSlider
            className="ucp-slider"
            min={min * factor}
            max={max * factor}
            step={step * factor}
            id={`${url}-slider`}
            size="sm"
            value={localValue}
            tooltipLabel={(currentValue) => (currentValue / factor).toString()}
            onChange={(event) => {
              setLocalValue(parseInt(event.target.value, 10));
            }}
            onAfterChange={(event) => {
              setConfiguration({
                type: 'set-multiple',
                value: Object.fromEntries([
                  [
                    url,
                    {
                      ...value,
                      ...{
                        sliderValue: parseInt(event.target.value, 10) / factor,
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
            disabled={!isEnabled || disabled || !value.enabled}
          />
        </div>

        <div className="col-auto">
          <Form.Label>{max}</Form.Label>
        </div>
      </div>
    </div>
  );
}

export default CreateUCP2Slider;
