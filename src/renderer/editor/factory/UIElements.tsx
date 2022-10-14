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

import React, { Fragment, ReactElement, useContext } from 'react';
import { GlobalState } from '../../GlobalState';
import { useTranslation } from 'react-i18next';

const DisplayDefaults: { [key: string]: string } = {
  boolean: 'Switch',
  string: 'TextEntry',
  integer: 'Number',
  number: 'Number',
};

export type DisplayConfigElement = {
  choices: string[];
  name: string;
  description: string;
  header: string;
  text: string;
  type: string;
  display: string;
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

const renderTooltip = (props: { [key: string]: unknown }) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <Tooltip {...(props as object)}>{props.tooltipText as string}</Tooltip>
);

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
  CreateGroupBox(args: { spec: DisplayConfigElement; disabled: boolean }) {
    const { spec, disabled } = args;
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

  CreateSwitch(args: { spec: DisplayConfigElement; disabled: boolean }) {
    const {
      configuration,
      setConfiguration,
      configurationWarnings,
      setConfigurationWarnings,
      setConfigurationTouched,
      configurationDefaults,
    } = useContext(GlobalState);
    const { spec, disabled } = args;
    const { url, text, tooltip, enabled } = spec;
    const { [url]: value } = configuration;
    let isEnabled = true;
    if (enabled !== undefined) {
      if (configuration[enabled] === undefined) {
        if (configurationDefaults[enabled] === undefined) {
          isEnabled = true;
        } else {
          isEnabled = configurationDefaults[enabled] as boolean;
        }
      } else {
        isEnabled = configuration[enabled] as boolean;
      }
    }
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = configurationWarnings[url] !== undefined;

    return (
      <div className="d-flex align-items-baseline lh-sm my-1">
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

  CreateNumberInput(args: { spec: DisplayConfigElement; disabled: boolean }) {
    const {
      configuration,
      setConfiguration,
      configurationWarnings,
      setConfigurationWarnings,
      setConfigurationTouched,
      configurationDefaults,
    } = useContext(GlobalState);
    const { spec, disabled } = args;
    const { url, text, tooltip, min, max, enabled } =
      spec as NumberInputDisplayConfigElement;
    const { [url]: value } = configuration;
    let isEnabled = true;
    if (enabled !== undefined) {
      if (configuration[enabled] === undefined) {
        if (configurationDefaults[enabled] === undefined) {
          isEnabled = true;
        } else {
          isEnabled = configurationDefaults[enabled] as boolean;
        }
      } else {
        isEnabled = configuration[enabled] as boolean;
      }
    }
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = configurationWarnings[url] !== undefined;

    return (
      <Form.Group className="d-flex align-items-baseline lh-sm config-number-group my-1">
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
          className={`flex-grow-1 px-2 ${!isEnabled || disabled ? 'label-disabled' : ''
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

  CreateChoice(args: { spec: DisplayConfigElement; disabled: boolean }) {
    const {
      configuration,
      setConfiguration,
      configurationWarnings,
      setConfigurationWarnings,
      setConfigurationTouched,
      configurationDefaults,
    } = useContext(GlobalState);
    const { spec, disabled } = args;
    const { url, text, tooltip, enabled, choices } = spec;
    const { [url]: value } = configuration;
    let isEnabled = true;
    if (enabled !== undefined) {
      if (configuration[enabled] === undefined) {
        if (configurationDefaults[enabled] === undefined) {
          isEnabled = true;
        } else {
          isEnabled = configurationDefaults[enabled] as boolean;
        }
      } else {
        isEnabled = configuration[enabled] as boolean;
      }
    }
    const fullToolTip = formatToolTip(tooltip, url);

    const hasWarning = configurationWarnings[url] !== undefined;
    const defaultChoice = choices[0];

    return (
      <Form.Group className="d-flex align-items-baseline lh-sm config-number-group my-1">
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
          className={`flex-grow-1 px-2 ${!isEnabled || disabled ? 'label-disabled' : ''
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

  CreateUIElement(args: { spec: DisplayConfigElement; disabled: boolean }) {
    const { spec, disabled } = args;

    const [t] = useTranslation(["gui-editor"]);

    if (spec.display === undefined) {
      if (spec.type !== undefined) {
        spec.display = DisplayDefaults[spec.type];
      }
    }
    if (spec.display === undefined) {
      console.warn(
        t("gui-editor:config.element.unsupported.type", { url: spec.url, type: spec.type })
      );
      return <div />;
    }
    if (spec.display === 'GroupBox') {
      return <UIFactory.CreateGroupBox spec={spec} disabled={disabled} />;
    }
    if (spec.display === 'Switch') {
      return <UIFactory.CreateSwitch spec={spec} disabled={disabled} />;
    }
    if (spec.display === 'Number') {
      return <UIFactory.CreateNumberInput spec={spec} disabled={disabled} />;
    }
    if (spec.display === 'Choice') {
      return <UIFactory.CreateChoice spec={spec} disabled={disabled} />;
    }
    console.warn(
      t("gui-editor:config.element.unsupported.type", { url: spec.url, type: spec.type })
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
    const children = childKeys.map((key) => (
      <UIFactory.CreateSection
        key={`${identifier}-${key}`}
        level={level + 1}
        header={key}
        contents={contents.sections[key]}
        identifier={`${identifier}-${key}`}
        readonly={readonly}
      />
    ));

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
          {Object.keys(subspec.sections).map((key) => (
            <UIFactory.NavSection
              key={`${href}-${key}`}
              subspec={subspec.sections[key]}
              header={key}
              href={`${href}-${key}`}
              depth={depth + 1}
            />
          ))}
        </nav>
      </>
    );
  },

  CreateSectionsNav(args: { spec: SectionDescription }) {
    const { spec } = args;

    const [t] = useTranslation(["gui-editor"]);

    const level1 = Object.keys(spec.sections).map((key) => (
      <UIFactory.NavSection
        key={`#config-${key}`}
        subspec={spec.sections[key]}
        header={key}
        href={`#config-${key}`}
        depth={1}
      />
    ));

    return (
      <nav
        id="config-navbar"
        className="navbar navbar-dark bg-dark flex-column align-items-stretch p-3 pe-0 col-3"
        style={{ justifyContent: 'flex-start' }}
      >
        <a className="navbar-brand" href="#config-General">
          {t("gui-editor:config.table.of.contents")}
        </a>
        <nav className="nav nav-pills flex-column">
          <a className="nav-link" href="#config-General">
            {t("gui-editor:config.general")}
          </a>
          {level1}
        </nav>
      </nav>
    );
  },

  CreateSections(args: { readonly: boolean }) {
    const {
      uiDefinition,
      configuration,
      setConfiguration,
      configurationWarnings,
    } = useContext(GlobalState);
    const definition = uiDefinition.hierarchical as SectionDescription;
    const { readonly } = args;

    const [t] = useTranslation(["gui-editor"]);

    const elements = (definition.elements as DisplayConfigElement[]).map(
      (el: DisplayConfigElement) => (
        <UIFactory.CreateUIElement
          key={el.url}
          spec={el as DisplayConfigElement}
          disabled={readonly}
        />
      )
    );
    const children = Object.keys(definition.sections).map((key) => (
      <UIFactory.CreateSection
        key={`config-${key}`}
        level={1}
        header={key}
        contents={definition.sections[key]}
        identifier={`config-${key}`}
        readonly={readonly}
      />
    ));
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
            <h1 id="config-General">{t("gui-editor:config.general")}</h1>
            {elements}
          </div>
          <div style={{ marginLeft: `1rem` }}>{children}</div>
        </div>
      </>
    );
  },
};

export { UIFactory };
