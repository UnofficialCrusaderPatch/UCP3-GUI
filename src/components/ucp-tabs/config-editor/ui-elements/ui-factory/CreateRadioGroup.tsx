import 'components/ucp-tabs/config-editor/ui-elements/ui-factory/specified/specified.css';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Form } from 'react-bootstrap';
import { useState, useRef, useContext } from 'react';
import ConfigTableCellContext from './ConfigTableCellContext';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
} from '../../../../../function/configuration/state';

import {
  ChoiceContents,
  RadioGroupDisplayConfigElement,
} from '../../../../../config/ucp/common';
import { parseEnabledLogic } from '../enabled-logic';
import { createStatusBarMessage } from './StatusBarMessage';
import { ConfigPopover } from './popover/ConfigPopover';
import ConfigWarning from './ConfigWarning';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
} from '../../../../../function/configuration/derived-state';
import Logger from '../../../../../util/scripts/logging';
import { createSpecifiedStyleIfSpecifiedAndTouched } from './specified/SpecifiedStyle';

// TODO is this deprecated?

const LOGGER = new Logger('CreateRadioGroup.tsx');

function CreateRadioGroup(args: {
  spec: RadioGroupDisplayConfigElement;
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

  const { spec, disabled, className } = args;
  const tableCell = useContext(ConfigTableCellContext);
  const warnings = useAtomValue(CONFIGURATION_WARNINGS_REDUCER_ATOM);
  const { url, text, enabled } = spec;
  const { contents } = spec;
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

  // const hasWarning = configurationWarnings[url] !== undefined;
  const defaultChoice = choices[0];

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

  const isInherited =
    !!tableCell && !!spec.inheritFrom && value === spec.inheritFrom.value;
  let selectedValue =
    value === undefined ? defaultChoice.name : (value as string);
  if (isInherited) {
    selectedValue = (configuration[spec.inheritFrom!.url] ??
      configurationDefaults[spec.inheritFrom!.url]) as string;
  }

  // eslint-disable-next-line func-style
  const onRadioClick = (newValue: string) => {
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
  };

  const radios = (tableCell?.choices || choices).map((columnChoice) => {
    const choice = choices.find((item) => item.name === columnChoice.name);
    if (!choice)
      return (
        <span
          key={columnChoice.name}
          className="config-table-unavailable"
          aria-hidden="true"
        >
          —
        </span>
      );
    return (
      // eslint-disable-next-line jsx-a11y/label-has-associated-control
      <div
        key={choice.name}
        className={`form-check ${tableCell ? 'sword-checkbox' : ''}`}
      >
        <input
          type="radio"
          name={url}
          aria-label={
            tableCell ? `${tableCell.label}: ${columnChoice.text}` : undefined
          }
          title={
            [
              tableCell ? `${tableCell.label}: ${columnChoice.text}` : '',
              spec.tooltip,
            ]
              .filter(Boolean)
              .join('\n') || undefined
          }
          disabled={isDisabled}
          className="form-check-input"
          checked={choice.name === selectedValue}
          onChange={() => {
            onRadioClick(choice.name);
          }}
          // Clicking the already-selected inherited value makes it explicit too.
          onClick={() => {
            if (isInherited && choice.name === selectedValue)
              onRadioClick(choice.name);
          }}
          id={`${url}-radio-${choice.name}`}
        />
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label
          className="form-check-label"
          htmlFor={`${url}-radio-${choice.name}`}
        >
          {tableCell ? (
            <span className="visually-hidden">{columnChoice.text}</span>
          ) : (
            choice.text
          )}
        </label>
      </div>
    );
  });

  const [showPopover, setShowPopover] = useState(false);
  const ref = useRef(null);

  const configurationTouched = useAtomValue(CONFIGURATION_TOUCHED_REDUCER_ATOM);
  const userConfiguration = useAtomValue(CONFIGURATION_USER_REDUCER_ATOM);
  const specifiedStyle = createSpecifiedStyleIfSpecifiedAndTouched(
    userConfiguration,
    configurationTouched,
    url,
  );

  return (
    <Form.Group
      className={`d-flex align-items-baseline lh-sm config-number-group my-1 ui-element ${(spec.style || { className: '' }).className} ${className} ${specifiedStyle}`}
      onMouseEnter={() => {
        if (isEnabled) {
          setShowPopover(true);
          setStatusBarMessage(statusBarMessage);
        }
      }}
      onMouseLeave={() => {
        setShowPopover(false);
        setStatusBarMessage(undefined);
      }}
      ref={ref}
      style={(spec.style || {}).css}
    >
      <ConfigPopover show={showPopover} url={url} theRef={ref} />
      {warnings[url] && (
        <ConfigWarning text={warnings[url].text} level={warnings[url].level} />
      )}
      {!tableCell && <p>{text}</p>}
      <div
        role="radiogroup"
        aria-label={tableCell?.label || text}
        className={`${isDisabled ? 'disabled' : ''} ${tableCell ? 'config-table-radios' : ''}`}
        style={
          tableCell
            ? {
                gridTemplateColumns: `repeat(${(tableCell.choices || choices).length}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {radios}
      </div>
    </Form.Group>
  );
}

export default CreateRadioGroup;
