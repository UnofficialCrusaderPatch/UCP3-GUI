import {
  useActiveExtensions,
  useConfigurationDefaults,
  useConfigurationReducer,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import { RadioGroup, Radio } from 'react-radio-group';

import { DisplayConfigElement } from 'config/ucp/common';
import { Form } from 'react-bootstrap';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';

function CreateRadioGroup(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useConfigurationReducer();
  const configurationWarnings = useConfigurationWarnings();
  const setConfigurationTouched = useSetConfigurationTouched();
  const configurationDefaults = useConfigurationDefaults();

  const { spec, disabled, className } = args;
  const { url, text, tooltip, enabled, choices } = spec;
  const { [url]: value } = configuration;
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;
  const defaultChoice = choices[0];

  const radios = choices.map((choice) => (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <div key={choice.name} className="form-check">
      <Radio
        className="form-check-input"
        value={choice.name}
        id={`${url}-radio-${choice.name}`}
      />
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label
        className="form-check-label"
        htmlFor={`${url}-radio-${choice.name}`}
      >
        {choice.text}
      </label>
    </div>
  ));
  return (
    <>
      <p>{text}</p>
      <RadioGroup
        name={url}
        selectedValue={value === undefined ? defaultChoice : (value as string)}
        onChange={(newValue: string) => {
          setConfiguration({
            type: 'set-multiple',
            value: Object.fromEntries([[url, newValue]]),
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
    </>
  );
}

export default CreateRadioGroup;
