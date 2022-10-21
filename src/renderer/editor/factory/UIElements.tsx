import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import ToggleButton from 'react-bootstrap/ToggleButton';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { Tooltip, Form, Overlay } from 'react-bootstrap';

import React, { Fragment, ReactElement, useContext, useEffect } from 'react';
import * as bootstrap from 'bootstrap';
import { useTranslation } from 'react-i18next';
import { RadioGroup, Radio } from 'react-radio-group';

import { GlobalState } from '../../GlobalState';
import { ucpBackEnd } from '../../fakeBackend';

import type {
  DisplayConfigElement,
  NumberInputDisplayConfigElement,
  OptionEntry,
  SectionDescription,
} from '../../../common/config/common';

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

  const reSimple = /^\s*([!]{0,1})([a-zA-Z0-9_.]+)\s*$/;
  const reBooleanComparison =
    /^\s*([a-zA-Z0-9_.]+)\s*((?:==)|(?:!=))\s*((?:true)|(?:false))\s*$/;
  const reNumericComparison =
    /^\s*([a-zA-Z0-9_.]+)\s*((?:==)|(?:!=))\s*([0-9.]+)\s*$/;
  const reStringComparison =
    /^\s*([a-zA-Z0-9_.]+)\s*((?:==)|(?:!=))\s*"([^"]+)"\s*$/;
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
    console.log(`string comparing ${url}: ${configValue} to ${value}`);
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

  CreateSwitch(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    className: string;
  }) {
    const {
      configuration,
      setConfiguration,
      configurationWarnings,
      setConfigurationWarnings,
      setConfigurationTouched,
      configurationDefaults,
    } = useContext(GlobalState);
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
    const {
      configuration,
      setConfiguration,
      configurationWarnings,
      setConfigurationWarnings,
      setConfigurationTouched,
      configurationDefaults,
    } = useContext(GlobalState);
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
    const {
      configuration,
      setConfiguration,
      configurationWarnings,
      setConfigurationWarnings,
      setConfigurationTouched,
      configurationDefaults,
    } = useContext(GlobalState);
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
            {choices.map((choice: string) => (
              <option key={`choice-${choice}`} value={choice}>
                {choice}
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
    const {
      configuration,
      setConfiguration,
      configurationWarnings,
      setConfigurationWarnings,
      setConfigurationTouched,
      configurationDefaults,
    } = useContext(GlobalState);

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

    const radios = choices.map((choice: string) => (
      // eslint-disable-next-line jsx-a11y/label-has-associated-control
      <div key={choice} className="form-check">
        <Radio
          className="form-check-input"
          value={choice}
          id={`${url}-radio-${choice}`}
        />
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="form-check-label" htmlFor={`${url}-radio-${choice}`}>
          {choice}
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
        className="navbar navbar-dark bg-dark flex-column align-items-stretch p-3 pe-0 col-3"
        style={{ justifyContent: 'flex-start' }}
      >
        <a className="navbar-brand" href="#config-General">
          {t('gui-editor:config.table.of.contents')}
        </a>
        <nav className="nav nav-pills flex-column">
          <a className="nav-link" href="#config-General">
            {t('gui-editor:config.general')}
          </a>
          {level1}
        </nav>
      </nav>
    );
  },

  CreateSections(args: { readonly: boolean }) {
    const {
      folder,
      activeExtensions,
      uiDefinition,
      configuration,
      setConfiguration,
      configurationWarnings,
    } = useContext(GlobalState);
    const optionEntries = ucpBackEnd
      .extensionsToOptionEntries(activeExtensions)
      .filter((o: OptionEntry) => o.hidden === undefined || o.hidden === false);
    const definition = ucpBackEnd.optionEntriesToHierarchical(optionEntries);
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
          style={{
            position: 'relative',
          }}
          className="col-9 p-3"
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
