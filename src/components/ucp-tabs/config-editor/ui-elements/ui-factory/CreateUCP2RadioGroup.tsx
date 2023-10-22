import {
  useConfigurationDefaults,
  useConfigurationLocks,
  useConfigurationReducer,
  useConfigurationSuggestions,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import { ChoiceContents, DisplayConfigElement } from 'config/ucp/common';
import { Form } from 'react-bootstrap';
import { RadioGroup, Radio } from 'react-radio-group';
import { STATUS_BAR_MESSAGE_ATOM } from 'function/global/global-atoms';
import { useSetAtom } from 'jotai';
import Logger from 'util/scripts/logging';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import { createStatusBarMessage } from './StatusBarMessage';

const LOGGER = new Logger('CreateUCP2RadioGroup.tsx');

function CreateUCP2RadioGroup(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useConfigurationReducer();
  const configurationWarnings = useConfigurationWarnings();
  const setConfigurationTouched = useSetConfigurationTouched();
  const configurationDefaults = useConfigurationDefaults();
  const configurationLocks = useConfigurationLocks();
  const configurationSuggestions = useConfigurationSuggestions();

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
    configurationDefaults,
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;
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
  return (
    <div
      className="col-5"
      style={{ marginLeft: 0, marginBottom: 0 }}
      onMouseEnter={() => {
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
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
          disabled={!value.enabled || isDisabled}
        >
          {choices.map((choice) => (
            // eslint-disable-next-line jsx-a11y/label-has-associated-control
            <div key={choice.name} className="form-check sword-checkbox">
              <Radio
                className="form-check-input"
                value={choice.name}
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
        </RadioGroup>
      </div>
    </div>
  );
}

export default CreateUCP2RadioGroup;
