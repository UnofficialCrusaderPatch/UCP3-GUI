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

import { Form } from 'react-bootstrap';

import React, { Fragment } from 'react';

export type DisplayConfigElement = {
  name: string;
  description: string;
  header: string;
  text: string;
  type: string;
  children: DisplayConfigElement[];
  default: unknown;
  url: string;
  columns: number;
  tooltip: string;
  enabled: string;
};

export type NumberInputDisplayConfigElement = DisplayConfigElement & {
  min: number;
  max: number;
};

export type SectionDescription = {
  elements: DisplayConfigElement[];
  sections: { [key: string]: SectionDescription };
};

function formatToolTip(tooltip: string, url: string) {
  if (tooltip === undefined || tooltip === '') {
    return `key: ${url}`;
  }
  return `${tooltip}\n\nurl:${url}`;
}

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
  CreateGroupBox(
    spec: DisplayConfigElement,
    disabled: boolean,
    configuration: { [key: string]: unknown },
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void,
    warnings: { [key: string]: { text: string; level: string } },
    setWarning: (args: { key: string; value: unknown; reset: boolean }) => void
  ) {
    const { name, description, children, columns, header } = spec;
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
              configuration={configuration}
              setConfiguration={setConfiguration}
              warnings={warnings}
              setWarning={setWarning}
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
        className="border-bottom border-light my-2 px-0"
        // style={{ marginLeft: '-1.5rem' }}
      >
        <Row className="my-3">
          <h5>{header}</h5>
          <div>
            <span>{description}</span>
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

  CreateSwitch(
    spec: DisplayConfigElement,
    disabled: boolean,
    configuration: { [url: string]: unknown },
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void,
    warnings: { [key: string]: { text: string; level: string } },
    setWarning: (args: { key: string; value: unknown; reset: boolean }) => void
  ) {
    const { url, text, tooltip, enabled } = spec;
    const { [url]: value } = configuration;
    let { [enabled]: isEnabled } = configuration;
    if (isEnabled === undefined) isEnabled = true;
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = warnings[url] !== undefined;

    return (
      <div className="d-flex align-items-baseline lh-sm my-1">
        {hasWarning ? (
          <UIFactory.ConfigWarning
            text={warnings[url].text}
            level={warnings[url].level}
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
              key: url,
              value: event.target.checked,
              reset: false,
            });
          }}
          disabled={!isEnabled || disabled}
        />
      </div>
    );
  },

  CreateNumberInputElement(
    spec: DisplayConfigElement,
    disabled: boolean,
    configuration: { [url: string]: unknown },
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void,
    warnings: { [key: string]: { text: string; level: string } },
    setWarning: (args: { key: string; value: unknown; reset: boolean }) => void
  ) {
    const { url, text, tooltip, min, max, enabled } =
      spec as NumberInputDisplayConfigElement;
    const { [url]: value } = configuration;
    let { [enabled]: isEnabled } = configuration;
    if (isEnabled === undefined) isEnabled = true;
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = warnings[url] !== undefined;

    return (
      <Form.Group className="d-flex align-items-baseline lh-sm config-number-group my-1">
        {hasWarning ? (
          <UIFactory.ConfigWarning
            text={warnings[url].text}
            level={warnings[url].level}
          />
        ) : null}
        <div className="col-1 mr-3">
          <Form.Control
            className="bg-dark text-light"
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
                key: url,
                value: parseInt(event.target.value, 10),
                reset: false,
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
            // disabled={!isEnabled || disabled}
          >
            {text}
          </Form.Label>
        </div>
      </Form.Group>
    );
  },

  CreateUIElement(args: {
    spec: DisplayConfigElement;
    disabled: boolean;
    configuration: { [key: string]: unknown };
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void;
    warnings: { [key: string]: { text: string; level: string } };
    setWarning: (args: { key: string; value: unknown; reset: boolean }) => void;
  }) {
    const {
      spec,
      disabled,
      configuration,
      setConfiguration,
      warnings,
      setWarning,
    } = args;
    if (spec.type === 'GroupBox') {
      return UIFactory.CreateGroupBox(
        spec,
        disabled,
        configuration,
        setConfiguration,
        warnings,
        setWarning
      );
    }
    if (spec.type === 'Switch') {
      return UIFactory.CreateSwitch(
        spec,
        disabled,
        configuration,
        setConfiguration,
        warnings,
        setWarning
      );
    }
    if (spec.type === 'Number') {
      return UIFactory.CreateNumberInputElement(
        spec,
        disabled,
        configuration,
        setConfiguration,
        warnings,
        setWarning
      );
    }
    return <div />;
  },

  CreateSection(args: {
    level: number;
    header: string;
    contents: SectionDescription;
    identifier: string;
    readonly: boolean;
    configuration: { [key: string]: unknown };
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void;
    warnings: { [key: string]: { text: string; level: string } };
    setWarning: (args: { key: string; value: unknown; reset: boolean }) => void;
  }) {
    const {
      level,
      identifier,
      header,
      contents,
      readonly,
      configuration,
      setConfiguration,
      warnings,
      setWarning,
    } = args;
    const elements = (contents.elements as DisplayConfigElement[]).map(
      (el: DisplayConfigElement) => {
        const key = el.url || `${identifier}-${el.name}`;
        return (
          <UIFactory.CreateUIElement
            key={key}
            spec={el as DisplayConfigElement}
            disabled={readonly}
            configuration={configuration}
            setConfiguration={setConfiguration}
            warnings={warnings}
            setWarning={setWarning}
          />
        );
      }
    );

    const htmlHeader = React.createElement(
      `h${level + 1}`,
      { id: identifier },
      header
    );

    const childKeys = Object.keys(contents.sections);
    const children = childKeys.map((key) => {
      return (
        <UIFactory.CreateSection
          key={`${identifier}-${key}`}
          level={level + 1}
          header={key}
          contents={contents.sections[key]}
          identifier={`${identifier}-${key}`}
          readonly={readonly}
          configuration={configuration}
          setConfiguration={setConfiguration}
          warnings={warnings}
          setWarning={setWarning}
        />
      );
    });

    return (
      // ${level / 4}rem
      <div key={identifier} style={{ marginLeft: `0rem` }}>
        {htmlHeader}
        <div style={{ marginLeft: '0rem', marginBottom: '0.5rem' }}>
          {elements}
        </div>
        {children}
      </div>
    );
  },

  CreateSectionsNav(args: { spec: SectionDescription }) {
    const { spec } = args;

    function NavSection(navArgs: {
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
              return (
                <NavSection
                  key={`${href}-${key}`}
                  subspec={subspec.sections[key]}
                  header={key}
                  href={`${href}-${key}`}
                  depth={depth + 1}
                />
              );
            })}
          </nav>
        </>
      );
    }

    const level1 = Object.keys(spec.sections).map((key) => {
      return (
        <NavSection
          key={`#config-${key}`}
          subspec={spec.sections[key]}
          header={key}
          href={`#config-${key}`}
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
          Table of Contents
        </a>
        <nav className="nav nav-pills flex-column">
          <a className="nav-link" href="#config-General">
            General
          </a>
          {level1}
        </nav>
      </nav>
    );
  },

  CreateSections(args: {
    definition: SectionDescription;
    readonly: boolean;
    configuration: { [key: string]: unknown };
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void;
    warnings: { [key: string]: { text: string; level: string } };
    setWarning: (args: { key: string; value: unknown; reset: boolean }) => void;
  }) {
    const {
      definition,
      readonly,
      configuration,
      setConfiguration,
      warnings,
      setWarning,
    } = args;
    const elements = (definition.elements as DisplayConfigElement[]).map(
      (el: DisplayConfigElement) => {
        return (
          <UIFactory.CreateUIElement
            key={el.url}
            spec={el as DisplayConfigElement}
            disabled={readonly}
            configuration={configuration}
            setConfiguration={setConfiguration}
            warnings={warnings}
            setWarning={setWarning}
          />
        );
      }
    );
    const children = Object.keys(definition.sections).map((key) => {
      return (
        <UIFactory.CreateSection
          key={`config-${key}`}
          level={1}
          header={key}
          contents={definition.sections[key]}
          identifier={`config-${key}`}
          readonly={readonly}
          configuration={configuration}
          setConfiguration={setConfiguration}
          warnings={warnings}
          setWarning={setWarning}
        />
      );
    });
    // https://getbootstrap.com/docs/5.0/components/scrollspy/#list-item-4
    return (
      <>
        <UIFactory.CreateSectionsNav spec={definition} />
        <div
          data-bs-spy="scroll"
          data-bs-target="#config-navbar"
          data-bs-offset="0"
          // tabIndex="0"
          className="col-9 p-3"
          id="config-sections"
        >
          <div style={{ marginLeft: `1rem` }}>
            <h1 id="config-General">General</h1>
            {elements}
          </div>
          <div style={{ marginLeft: `1rem` }}>{children}</div>
        </div>
      </>
    );
  },
};

export { UIFactory };
