import {
  useActiveExtensions,
  useConfigurationDefaults,
  useConfigurationReducer,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import {
  DisplayConfigElement,
  NumberContents,
  ChoiceContents,
} from 'config/ucp/common';

import { Form } from 'react-bootstrap';
import { RadioGroup, Radio } from 'react-radio-group';

import { useState } from 'react';

import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import RangeSlider from 'react-bootstrap-range-slider';

import { parseEnabledLogic } from '../enabled-logic';

import { formatToolTip } from '../tooltips';

type UCP2SliderChoiceContent = {
  name: string;
  text: string;
  enabled: string;
  min: number;
  max: number;
  step: number;
};

type UCP2SliderChoiceContents = ChoiceContents & {
  choices: UCP2SliderChoiceContent[];
};

function CreateUCP2SliderChoice(args: {
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

  const radios = choices.map((choice: UCP2SliderChoiceContent) => {
    const factor =
      1 /
      // eslint-disable-next-line no-nested-ternary
      (choice.step === undefined ? 1 : choice.step === 0 ? 1 : choice.step);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [localValue, setLocalValue] = useState(
      value.choices[choice.name].slider === undefined
        ? 0
        : (value.choices[choice.name].slider as number) * factor
    );
    return (
      // eslint-disable-next-line jsx-a11y/label-has-associated-control
      <div key={choice.name} className="form-check">
        <div className="sword-checkbox">
          <Radio
            className="form-check-input"
            value={choice.name}
            id={`${url}-radio-${choice.name}`}
            disabled={!value.enabled}
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
                  value.choice !== choice.name
                }
              >
                {choice.min}
              </Form.Label>
            </div>
            <div className="col-6">
              <RangeSlider
                min={choice.min * factor}
                max={choice.max * factor}
                step={choice.step * factor}
                id={`${url}-slider`}
                size="sm"
                variant="primary"
                value={localValue}
                tooltipLabel={(currentValue) =>
                  (currentValue / factor).toString()
                }
                onChange={(event) => {
                  setLocalValue(parseInt(event.target.value, 10));
                }}
                onAfterChange={(event) => {
                  setLocalValue(parseInt(event.target.value, 10));
                  const newValue = { ...value };
                  newValue.choices[choice.name].slider =
                    parseInt(event.target.value, 10) / factor;
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
                  value.choice !== choice.name
                }
              />
            </div>
            <div className="col-auto">
              <Form.Label
                disabled={
                  !isEnabled ||
                  disabled ||
                  !value.enabled ||
                  value.choice !== choice.name
                }
              >
                {choice.max}
              </Form.Label>
            </div>
          </div>
        </div>
      </div>
    );
  });

  let enabledOption = '';
  if (value !== undefined) {
    enabledOption = value.choice;
  }

  return (
    <div className="pb-3">
      {headerElement}
      <p>{text}</p>
      <RadioGroup
        name={url}
        selectedValue={enabledOption}
        onChange={(newValue: string) => {
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
        }}
      >
        {radios}
      </RadioGroup>
    </div>
  );
}

export default CreateUCP2SliderChoice;
