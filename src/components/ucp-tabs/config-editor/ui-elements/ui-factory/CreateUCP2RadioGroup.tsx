import {
  useActiveExtensions,
  useConfigurationDefaults,
  useConfigurationReducer,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import { ChoiceContents, DisplayConfigElement } from 'config/ucp/common';
import { Form } from 'react-bootstrap';
import { RadioGroup, Radio } from 'react-radio-group';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';

function CreateUCP2RadioGroup(args: {
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
      <Form.Switch>
        <Form.Switch.Input
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
        <Form.Switch.Label className="fs-6" htmlFor={`${url}-header`}>
          {header}
        </Form.Switch.Label>
      </Form.Switch>
    );
  }
  return (
    <div className="col-5" style={{ marginLeft: 0, marginBottom: 0 }}>
      {headerElement}
      <div>
        <label className="form-check-label" htmlFor={`${url}-choice`}>
          {!hasHeader && header}
          {text}
        </label>
      </div>
      <div className="row">
        <RadioGroup
          name={url}
          selectedValue={value.choice}
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
          disabled={!value.enabled}
        >
          {choices.map((choice) => (
            // eslint-disable-next-line jsx-a11y/label-has-associated-control
            <div key={choice.name} className="form-check">
              <Radio
                className="form-check-input"
                value={choice.name}
                id={`${url}-radio-${choice.name}`}
                disabled={!value.enabled}
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
        </RadioGroup>
      </div>
    </div>
  );
}

export default CreateUCP2RadioGroup;
