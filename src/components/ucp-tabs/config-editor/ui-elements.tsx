// TODO: The whole thing is deeply linked to the config currently.
// As a result, every update to the object triggers a redraw of everything that uses the config
// Including every single option, despite only one of them changes.
// once the basic structure is set, here is a big place for optimization
// for example: the state is kept in the config, but also the elements,
// the config is not replaced, so it does not trigger a redraw of everything
// the number of warnings could be kept in an extra value, or be coupled with a redraw trigger;

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { Tooltip, Form } from 'react-bootstrap';

import React, { useEffect, useState } from 'react';
import * as bootstrap from 'bootstrap';
import { useTranslation } from 'react-i18next';
import { RadioGroup, Radio } from 'react-radio-group';
import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import RangeSlider from 'react-bootstrap-range-slider';

import type {
  DisplayConfigElement,
  NumberInputDisplayConfigElement,
  OptionEntry,
  SectionDescription,
} from 'config/ucp/common';
import {
  extensionsToOptionEntries,
  optionEntriesToHierarchical,
} from 'config/ucp/extension-util';
import {
  useActiveExtensionsReducer,
  useConfigurationDefaultsReducer,
  useConfigurationReducer,
  useConfigurationTouchedReducer,
  useConfigurationWarningsReducer,
} from 'hooks/jotai/globals-wrapper';

const DisplayDefaults: { [key: string]: string } = {
  boolean: 'Switch',
  string: 'TextEntry',
  integer: 'Number',
  number: 'Number',
};

function formatToolTip(tooltip: string, url: string) {
  if (tooltip === undefined || tooltip === '') {
    return `key: ${url}`;
  }
  return `${tooltip}\n\nurl:${url}`;
}

const renderTooltip = (props: { [key: string]: unknown }) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <Tooltip {...(props as object)}>{props.tooltipText as string}</Tooltip>
);

const parseEnabledLogic = (
  statement: string,
  configuration: { [key: string]: unknown },
  configurationDefaults: { [key: string]: unknown }
) => {
  if (statement === undefined || statement === null) return true;

  const reLiteral = /^(true|false)$/;
  const reSimple = /^\s*([!]{0,1})([a-zA-Z0-9_.]+)\s*$/;
  const reBooleanComparison =
    /^\s*([a-zA-Z0-9_.]+)\s*((?:==)|(?:!=))\s*((?:true)|(?:false))\s*$/;
  const reNumericComparison =
    /^\s*([a-zA-Z0-9_.]+)\s*((?:==)|(?:!=))\s*([0-9.]+)\s*$/;
  const reStringComparison =
    /^\s*([a-zA-Z0-9_.]+)\s*((?:==)|(?:!=))\s*"([^"]+)"\s*$/;

  const sLiteral = reLiteral.exec(statement);
  if (sLiteral !== null) {
    const [, lit] = sLiteral;
    if (lit === 'true') return true;
    if (lit === 'false') return false;
    throw new Error('we should never get here');
  }
  const sSimple = reSimple.exec(statement);
  if (sSimple !== null) {
    const [, exclamationMark, url] = sSimple;
    const configValue =
      configuration[url] !== undefined
        ? configuration[url]
        : configurationDefaults[url];
    if (configValue === undefined) return undefined;
    if (exclamationMark === '!') {
      return configValue !== true;
    }
    return configValue !== false;
  }
  const sBoolComp = reBooleanComparison.exec(statement);
  if (sBoolComp !== null) {
    const [, url, comparator, value] = sBoolComp;
    const configValue =
      configuration[url] !== undefined
        ? configuration[url]
        : configurationDefaults[url];
    if (configValue === undefined) return undefined;
    if (comparator === '==') {
      if (value === 'true') {
        return configValue === true;
      }
      if (value === 'false') {
        return configValue === false;
      }
      return undefined;
    }
    if (comparator === '!=') {
      if (value === 'true') {
        return configValue !== true;
      }
      if (value === 'false') {
        return configValue !== false;
      }
      return undefined;
    }
    return undefined;
  }
  const sNumComp = reNumericComparison.exec(statement);
  if (sNumComp !== null) {
    const [, url, comparator, value] = sNumComp;
    const configValue =
      configuration[url] !== undefined
        ? configuration[url]
        : configurationDefaults[url];
    if (configValue === undefined) return undefined;
    if (comparator === '==') {
      return configValue === parseFloat(value);
    }
    if (comparator === '!=') {
      return configValue !== parseFloat(value);
    }
    return undefined;
  }
  const sStringComp = reStringComparison.exec(statement);
  if (sStringComp !== null) {
    const [, url, comparator, value] = sStringComp;
    const configValue =
      configuration[url] !== undefined
        ? configuration[url]
        : configurationDefaults[url];
    if (configValue === undefined) return undefined;
    if (comparator === '==') {
      return configValue === value;
    }
    if (comparator === '!=') {
      return configValue !== value;
    }
    return undefined;
  }
  return undefined;
};

const sanitizeID = (id: string) => id.toLowerCase().replaceAll(' ', '-');

const UIFactory = {
  ConfigWarning(args: { text: string; level: string }) {
    const { text, level } = args;
    let textColour = 'text-warning';
    if (level !== undefined) textColour = `text-${level}`;
    if (level === 'error') textColour = `text-danger`;
    return (
      <div className="user-select-none">
        <span
          className={`position-relative fs-4 ${textColour}`}
          style={{ marginLeft: `${-2}rem` }}
          title={text}
        >
          &#9888;
        </span>
      </div>
    );
  },
  CreateUCP2RadioGroup(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const [configuration, setConfiguration] = useConfigurationReducer();
    const [configurationWarnings] = useConfigurationWarningsReducer();
    const [, setConfigurationTouched] = useConfigurationTouchedReducer();
    const [configurationDefaults] = useConfigurationDefaultsReducer();

    const { spec, disabled, className } = args;
    const { url, text, tooltip, enabled, header } = spec;
    const { choices } = spec as unknown as {
      choices: { name: string; text: string; subtext: string }[];
    };
    const { [url]: value } = configuration as {
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
  },
  CreateUCP2Slider(args: {
    spec: NumberInputDisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const [configuration, setConfiguration] = useConfigurationReducer();
    const [configurationWarnings] = useConfigurationWarningsReducer();
    const [, setConfigurationTouched] = useConfigurationTouchedReducer();
    const [configurationDefaults] = useConfigurationDefaultsReducer();

    const { spec, disabled, className } = args;
    const { url, text, tooltip, enabled, min, max, step, header } = spec;
    const { [url]: value } = configuration as {
      [url: string]: { enabled: boolean; sliderValue: number };
    };
    const isEnabled = parseEnabledLogic(
      enabled,
      configuration,
      configurationDefaults
    );
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = configurationWarnings[url] !== undefined;
    const { hasHeader } = spec as NumberInputDisplayConfigElement & {
      hasHeader: boolean;
    };
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
    // eslint-disable-next-line no-nested-ternary
    const factor = 1 / (step === undefined ? 1 : step === 0 ? 1 : step);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [localValue, setLocalValue] = useState(
      value.sliderValue === undefined
        ? 0
        : (value.sliderValue as number) * factor
    );
    return (
      <div className="col-5" style={{ marginLeft: 0, marginBottom: 0 }}>
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
          <div className="col">
            <RangeSlider
              min={min * factor}
              max={max * factor}
              step={step * factor}
              id={`${url}-slider`}
              size="sm"
              value={localValue}
              tooltipLabel={(currentValue) =>
                (currentValue / factor).toString()
              }
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
                          sliderValue:
                            parseInt(event.target.value, 10) / factor,
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
  },
  CreateUCP2Switch(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const [configuration, setConfiguration] = useConfigurationReducer();
    const [configurationWarnings] = useConfigurationWarningsReducer();
    const [, setConfigurationTouched] = useConfigurationTouchedReducer();
    const [configurationDefaults] = useConfigurationDefaultsReducer();

    const { spec, disabled, className } = args;
    const { url, text, tooltip, enabled, header } = spec;
    const { [url]: value } = configuration;
    const isEnabled = parseEnabledLogic(
      enabled,
      configuration,
      configurationDefaults
    );
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = configurationWarnings[url] !== undefined;
    const headerElement = (
      <Form.Switch>
        <Form.Switch.Input
          className="me-2"
          id={`${url}`}
          key={`${url}-switch`}
          checked={value === undefined ? false : (value as boolean)}
          onChange={(event) => {
            setConfiguration({
              type: 'set-multiple',
              value: Object.fromEntries([[url, event.target.checked]]),
            });
            setConfigurationTouched({
              type: 'set-multiple',
              value: Object.fromEntries([[url, true]]),
            });
          }}
          disabled={!isEnabled || disabled}
        />
        <Form.Switch.Label className="fs-6" htmlFor={`${url}`}>
          {header}
        </Form.Switch.Label>
      </Form.Switch>
    );

    return (
      <div className="col" style={{ marginLeft: 0, marginBottom: 0 }}>
        {headerElement}
        {text}
      </div>
    );
  },
  CreateUCP2SliderChoice(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const [configuration, setConfiguration] = useConfigurationReducer();
    const [configurationWarnings] = useConfigurationWarningsReducer();
    const [, setConfigurationTouched] = useConfigurationTouchedReducer();
    const [configurationDefaults] = useConfigurationDefaultsReducer();

    const { spec, disabled, className } = args;
    const { url, text, tooltip, enabled, header, choices } =
      spec as DisplayConfigElement & {
        choices: {
          name: string;
          enabled: boolean;
          slider: number;
          min: number;
          max: number;
          step: number;
          text: string;
        }[];
      };
    const { [url]: value } = configuration as {
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
    const { hasHeader } = spec as NumberInputDisplayConfigElement & {
      hasHeader: boolean;
    };
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

    const radios = choices.map(
      (choice: {
        name: string;
        enabled: boolean;
        slider: number;
        min: number;
        max: number;
        step: number;
        text: string;
      }) => {
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
            <Radio
              className="form-check-input"
              value={choice.name}
              id={`${url}-radio-${choice.name}`}
              disabled={!value.enabled}
            />
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <div className="col" style={{ marginLeft: 0, marginBottom: 0 }}>
              <div className="pb-1">
                <label
                  className="form-check-label"
                  htmlFor={`${url}-radio-${choice.name}`}
                >
                  {choice.text}
                </label>
              </div>
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
                <div className="col-4">
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
      }
    );

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
  },
  CreateParagraph(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const { spec, disabled, className } = args;
    const { name, description, header, text } = spec;

    // eslint-disable-next-line react/jsx-no-useless-fragment
    let headerElement = <></>;
    if (header !== undefined) {
      headerElement = <h5>{header}</h5>;
    }

    return (
      <>
        {headerElement}
        <p>{text || ''}</p>
      </>
    );
  },
  CreateGroup(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const { spec, disabled, className } = args;
    const { name, description, children, header, text } = spec;

    let { columns } = spec;
    if (columns === undefined) columns = 1;

    let finalDescription = description;
    if (finalDescription === undefined) finalDescription = text;
    const itemCount = children.length;
    const rows = Math.ceil(itemCount / columns);

    const cs = [];

    for (let row = 0; row < rows; row += 1) {
      const rowChildren = [];
      for (
        let i = columns * row;
        i < Math.min(columns * (row + 1), children.length);
        i += 1
      ) {
        rowChildren.push(
          <Col key={`${name}-${row}-${children[i].url || children[i].name}`}>
            <UIFactory.CreateUIElement
              key={children[i].url}
              spec={children[i]}
              disabled={disabled}
              className=""
            />
          </Col>
        );
      }
      // Or use key: children[i].url but that fails if no children?
      cs.push(
        <Row key={`${name}-${row}`} className="my-1">
          {rowChildren}
        </Row>
      );
    }

    return (
      <Container
        className={`my-2 px-0 pb-4 ${className}`}
        style={{ margin: 0 }}
      >
        {cs}
      </Container>
    );
  },
  CreateGroupBox(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const { spec, disabled, className } = args;
    const { name, description, children, header, text } = spec;

    let { columns } = spec;
    if (columns === undefined) columns = 1;

    let finalDescription = description;
    if (finalDescription === undefined) finalDescription = text;
    const itemCount = children.length;
    const rows = Math.ceil(itemCount / columns);

    const cs = [];

    for (let row = 0; row < rows; row += 1) {
      const rowChildren = [];
      for (
        let i = columns * row;
        i < Math.min(columns * (row + 1), children.length);
        i += 1
      ) {
        rowChildren.push(
          <Col key={children[i].url}>
            <UIFactory.CreateUIElement
              key={children[i].url}
              spec={children[i]}
              disabled={disabled}
              className=""
            />
          </Col>
        );
      }
      // Or use key: children[i].url but that fails if no children?
      cs.push(
        <Row key={`${name}-${row}`} className="my-1">
          {rowChildren}
        </Row>
      );
    }

    return (
      // <Form key={`${name}-groupbox`}>
      <Container
        className={`border-bottom border-light my-2 px-0 ${className}`}
        style={{ margin: 0 }}
      >
        <Row className="my-3">
          <h5>{header}</h5>
          <div>
            <span>{finalDescription}</span>
          </div>
        </Row>
        <Row className="mt-1">{cs}</Row>
        <Row>
          <span className="text-muted text-end">module-name-v1.0.0</span>
        </Row>
      </Container>
      // </Form>
    );
  },
  CreateSlider(args: {
    spec: NumberInputDisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const [configuration, setConfiguration] = useConfigurationReducer();
    const [configurationWarnings] = useConfigurationWarningsReducer();
    const [, setConfigurationTouched] = useConfigurationTouchedReducer();
    const [configurationDefaults] = useConfigurationDefaultsReducer();

    const { spec, disabled, className } = args;
    const { url, text, tooltip, enabled, min, max, step } = spec;
    const { [url]: value } = configuration as {
      [url: string]: { enabled: boolean; sliderValue: number };
    };
    const isEnabled = parseEnabledLogic(
      enabled,
      configuration,
      configurationDefaults
    );
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = configurationWarnings[url] !== undefined;

    // eslint-disable-next-line no-nested-ternary
    const factor = 1 / (step === undefined ? 1 : step === 0 ? 1 : step);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [localValue, setLocalValue] = useState(
      value.sliderValue === undefined
        ? 0
        : (value.sliderValue as number) * factor
    );
    return (
      <div>
        <RangeSlider
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
    );
  },
  CreateSwitch(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const [configuration, setConfiguration] = useConfigurationReducer();
    const [configurationWarnings] = useConfigurationWarningsReducer();
    const [, setConfigurationTouched] = useConfigurationTouchedReducer();
    const [configurationDefaults] = useConfigurationDefaultsReducer();

    const { spec, disabled, className } = args;
    const { url, text, tooltip, enabled } = spec;
    const { [url]: value } = configuration;
    const isEnabled = parseEnabledLogic(
      enabled,
      configuration,
      configurationDefaults
    );
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = configurationWarnings[url] !== undefined;

    return (
      <div className="d-flex align-items-baseline lh-sm my-1 {className}">
        {hasWarning ? (
          <UIFactory.ConfigWarning
            text={configurationWarnings[url].text}
            level={configurationWarnings[url].level}
          />
        ) : null}
        <Form.Switch
          className=""
          // Tooltip stuff
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title={fullToolTip}
          // End of tooltip stuff
          key={`${url}-switch`}
          label={text}
          id={`${url}-switch`}
          checked={value === undefined ? false : (value as boolean)}
          onChange={(event) => {
            setConfiguration({
              type: 'set-multiple',
              value: Object.fromEntries([[url, event.target.checked]]),
            });
            setConfigurationTouched({
              type: 'set-multiple',
              value: Object.fromEntries([[url, true]]),
            });
          }}
          disabled={!isEnabled || disabled}
        />
      </div>
    );
  },

  CreateNumberInput(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const [configuration, setConfiguration] = useConfigurationReducer();
    const [configurationWarnings] = useConfigurationWarningsReducer();
    const [, setConfigurationTouched] = useConfigurationTouchedReducer();
    const [configurationDefaults] = useConfigurationDefaultsReducer();

    const { spec, disabled, className } = args;
    const { url, text, tooltip, min, max, enabled } =
      spec as NumberInputDisplayConfigElement;
    const { [url]: value } = configuration;
    const isEnabled = parseEnabledLogic(
      enabled,
      configuration,
      configurationDefaults
    );
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = configurationWarnings[url] !== undefined;

    return (
      <Form.Group
        className={`d-flex align-items-baseline lh-sm config-number-group my-1 ${className}`}
      >
        {hasWarning ? (
          <UIFactory.ConfigWarning
            text={configurationWarnings[url].text}
            level={configurationWarnings[url].level}
          />
        ) : null}
        <div className="col-1 mr-3">
          <Form.Control
            className="bg-dark text-light fs-7 lh-1"
            key={`${url}-input`}
            type="number"
            min={min as number}
            max={max as number}
            id={`${url}-input`}
            // Tooltip stuff
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title={fullToolTip}
            // End of tooltip stuff
            value={value === undefined ? 0 : (value as number)}
            onChange={(event) => {
              setConfiguration({
                type: 'set-multiple',
                value: Object.fromEntries([
                  [url, parseInt(event.target.value, 10)],
                ]),
              });
              setConfigurationTouched({
                type: 'set-multiple',
                value: Object.fromEntries([[url, true]]),
              });
            }}
            disabled={!isEnabled || disabled}
          />
        </div>
        <div
          className={`flex-grow-1 px-2 ${
            !isEnabled || disabled ? 'label-disabled' : ''
          }`}
        >
          <Form.Label
            htmlFor={`${url}-input`}
            // Tooltip stuff
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title={fullToolTip}
            // End of tooltip stuff
            // disabled={!isEnabled || disabled}
          >
            {text}
          </Form.Label>
        </div>
      </Form.Group>
    );
  },

  CreateChoice(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const [configuration, setConfiguration] = useConfigurationReducer();
    const [configurationWarnings] = useConfigurationWarningsReducer();
    const [, setConfigurationTouched] = useConfigurationTouchedReducer();
    const [configurationDefaults] = useConfigurationDefaultsReducer();

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
    const defaultChoice = choices[0].name;

    return (
      <Form.Group
        className={`d-flex align-items-baseline lh-sm config-number-group my-1 ${className}`}
      >
        {hasWarning ? (
          <UIFactory.ConfigWarning
            text={configurationWarnings[url].text}
            level={configurationWarnings[url].level}
          />
        ) : null}
        <div className="col-3">
          <Form.Select
            size="sm"
            className="bg-dark text-light fs-7 lh-1"
            key={`${url}-input`}
            id={`${url}-input`}
            // Tooltip stuff
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title={fullToolTip}
            // End of tooltip stuff
            value={value === undefined ? defaultChoice : (value as string)}
            onChange={(event) => {
              setConfiguration({
                type: 'set-multiple',
                value: Object.fromEntries([[url, event.target.value]]),
              });
              setConfigurationTouched({
                type: 'set-multiple',
                value: Object.fromEntries([[url, true]]),
              });
            }}
            disabled={!isEnabled || disabled}
          >
            {choices.map((choice) => (
              <option key={`choice-${choice.name}`} value={choice.name}>
                {choice.text}
              </option>
            ))}
          </Form.Select>
        </div>
        <div
          className={`flex-grow-1 px-2 ${
            !isEnabled || disabled ? 'label-disabled' : ''
          }`}
        >
          <Form.Label
            htmlFor={`${url}-input`}
            // Tooltip stuff
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title={fullToolTip}
            // End of tooltip stuff
            // disabled={!isEnabled || disabled}
          >
            {text}
          </Form.Label>
        </div>
      </Form.Group>
    );
  },

  CreateRadioGroup(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const [configuration, setConfiguration] = useConfigurationReducer();
    const [configurationWarnings] = useConfigurationWarningsReducer();
    const [, setConfigurationTouched] = useConfigurationTouchedReducer();
    const [configurationDefaults] = useConfigurationDefaultsReducer();

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
          selectedValue={
            value === undefined ? defaultChoice : (value as string)
          }
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
  },

  CreateUIElement(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const { spec, disabled, className } = args;

    const [t] = useTranslation(['gui-editor']);

    if (spec.display === undefined) {
      if (spec.type !== undefined) {
        spec.display = DisplayDefaults[spec.type];
      }
    }
    if (spec.display === undefined) {
      console.warn(
        t('gui-editor:config.element.unsupported.type', {
          url: spec.url,
          type: spec.type,
        })
      );
      return <div />;
    }
    if (spec.display === 'UCP2Slider') {
      return (
        <UIFactory.CreateUCP2Slider
          spec={spec as NumberInputDisplayConfigElement}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'UCP2SliderChoice') {
      return (
        <UIFactory.CreateUCP2SliderChoice
          spec={spec as NumberInputDisplayConfigElement}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'UCP2Switch') {
      return (
        <UIFactory.CreateUCP2Switch
          spec={spec as DisplayConfigElement}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'UCP2RadioGroup') {
      return (
        <UIFactory.CreateUCP2RadioGroup
          spec={spec as DisplayConfigElement}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'Slider') {
      return (
        <UIFactory.CreateSlider
          spec={spec as NumberInputDisplayConfigElement}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'Paragraph') {
      return (
        <UIFactory.CreateParagraph
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'Group') {
      return (
        <UIFactory.CreateGroup
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'GroupBox') {
      return (
        <UIFactory.CreateGroupBox
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'Switch') {
      return (
        <UIFactory.CreateSwitch
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'Number') {
      return (
        <UIFactory.CreateNumberInput
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'Choice') {
      return (
        <UIFactory.CreateChoice
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    }
    if (spec.display === 'RadioGroup') {
      return (
        <UIFactory.CreateRadioGroup
          spec={spec}
          disabled={disabled}
          className={className}
        />
      );
    }
    console.warn(
      t('gui-editor:config.element.unsupported.type', {
        url: spec.url,
        type: spec.type,
      })
    );
    return <div />;
  },

  CreateSection(args: {
    level: number;
    header: string;
    contents: SectionDescription;
    identifier: string;
    readonly: boolean;
  }) {
    const { level, identifier, header, contents, readonly } = args;
    const elements = (contents.elements as DisplayConfigElement[]).map(
      (el: DisplayConfigElement) => {
        const key = el.url || `${identifier}-${el.name}`;
        return (
          <UIFactory.CreateUIElement
            key={key}
            spec={el as DisplayConfigElement}
            disabled={readonly}
            className="pt-1"
          />
        );
      }
    );

    const htmlHeader = React.createElement(`h${level + 1}`, {}, header);

    const childKeys = Object.keys(contents.sections);
    const children = childKeys.map((key) => {
      const id = sanitizeID(`${identifier}-${key}`);
      return (
        <UIFactory.CreateSection
          key={id}
          level={level + 1}
          header={key}
          contents={contents.sections[key]}
          identifier={id}
          readonly={readonly}
        />
      );
    });

    return (
      // ${level / 4}rem
      <div
        key={identifier}
        id={identifier}
        style={{ marginLeft: `0rem`, paddingTop: `${(10 - level) * 0.1}rem` }}
      >
        {htmlHeader}
        <div style={{ marginLeft: '0rem', marginBottom: '0.0rem' }}>
          {elements}
        </div>
        {children}
      </div>
    );
  },

  NavSection(navArgs: {
    subspec: SectionDescription;
    header: string;
    href: string;
    depth: number;
  }) {
    const { subspec, header, href, depth } = navArgs;
    const iClassName = `nav nav-pills flex-column`;
    const style = { marginLeft: `${depth / 2}rem` };
    return (
      <>
        <a className="nav-link" href={href}>
          {header}
        </a>
        <nav className={iClassName} style={style}>
          {Object.keys(subspec.sections).map((key) => {
            const id = sanitizeID(`${href}-${key}`);
            return (
              <UIFactory.NavSection
                key={id}
                subspec={subspec.sections[key]}
                header={key}
                href={id}
                depth={depth + 1}
              />
            );
          })}
        </nav>
      </>
    );
  },

  CreateSectionsNav(args: { spec: SectionDescription }) {
    const { spec } = args;

    const [t] = useTranslation(['gui-editor']);
    const level1 = Object.keys(spec.sections).map((key) => {
      const id = sanitizeID(`#config-${key}`);
      return (
        <UIFactory.NavSection
          key={id}
          subspec={spec.sections[key]}
          header={key}
          href={id}
          depth={1}
        />
      );
    });

    return (
      <nav
        id="config-navbar"
        className="navbar navbar-dark bg-dark flex-column align-items-stretch p-3 pb-0 pe-0 col-3 justify-content-start h-100 flex-nowrap"
      >
        <a className="navbar-brand" href="#config-General">
          {t('gui-editor:config.table.of.contents')}
        </a>
        <nav className="nav nav-pills flex-column overflow-auto flex-nowrap">
          <a className="nav-link" href="#config-General">
            {t('gui-editor:config.general')}
          </a>
          {level1}
        </nav>
      </nav>
    );
  },

  CreateSections(args: { readonly: boolean }) {
    const [activeExtensions] = useActiveExtensionsReducer();

    const optionEntries = extensionsToOptionEntries(activeExtensions).filter(
      (o: OptionEntry) => o.hidden === undefined || o.hidden === false
    );
    const definition = optionEntriesToHierarchical(optionEntries);
    const { readonly } = args;

    const [t] = useTranslation(['gui-editor']);

    useEffect(() => {
      // eslint-disable-next-line no-new
      new bootstrap.ScrollSpy(
        document.querySelector('#dynamicConfigPanel') as Element,
        {
          target: '#config-navbar',
          offset: 10,
          method: 'offset',
        }
      );
    });

    if (optionEntries.length === 0) {
      // Display message that no config options can be displayed
      return (
        // <h3
        //   style={{
        //     display: 'flex',
        //     justifyContent: 'center',
        //     alignItems: 'center',
        //     textAlign: 'center',
        //     minHeight: '85vh',
        //   }}
        // >
        //   No extensions are active, so there are no options to display! Go to
        //   the Extensions tab to activate an Extension.
        // </h3>
        // eslint-disable-next-line react/jsx-no-useless-fragment
        <></>
      );
    }

    const elements = (definition.elements as DisplayConfigElement[]).map(
      (el: DisplayConfigElement) => (
        <UIFactory.CreateUIElement
          key={el.url}
          spec={el as DisplayConfigElement}
          disabled={readonly}
          className=""
        />
      )
    );

    const children = Object.keys(definition.sections).map((key) => {
      const id = sanitizeID(`config-${key}`);
      return (
        <UIFactory.CreateSection
          key={id}
          level={1}
          header={key}
          contents={definition.sections[key]}
          identifier={id}
          readonly={readonly}
        />
      );
    });

    // https://getbootstrap.com/docs/5.0/components/scrollspy/#list-item-4
    return (
      <>
        <UIFactory.CreateSectionsNav spec={definition} />
        <div
          // data-bs-spy="scroll"
          // data-bs-target="#config-navbar"
          // data-bs-offset="0"
          // // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          // tabIndex={0}
          className="col-9 p-3 pb-0 h-100"
          id="config-sections"
        >
          <div id="config-General" style={{ marginLeft: `1rem` }}>
            <h1 id="config-General">{t('gui-editor:config.general')}</h1>
            {elements}
          </div>
          <div style={{ marginLeft: `1rem` }}>{children}</div>
        </div>
      </>
    );
  },
};

// eslint-disable-next-line import/prefer-default-export
export { UIFactory };
