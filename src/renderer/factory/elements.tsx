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
};

export type NumberInputDisplayConfigElement = DisplayConfigElement & {
  min: number;
  max: number;
};

export type SectionDescription = {
  elements: DisplayConfigElement[];
  sections: { [key: string]: SectionDescription };
};

const UIFactory = {
  CreateGroupBox(
    spec: DisplayConfigElement,
    configuration: { [key: string]: unknown },
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void
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
          <Col>
            <UIFactory.CreateUIElement
              spec={children[i]}
              configuration={configuration}
              setConfiguration={setConfiguration}
            />
          </Col>
        );
      }
      cs.push(<Row className="my-1">{rowChildren}</Row>);
    }

    return (
      <Form key={`${name}-groupbox`}>
        <Container className="border-bottom border-light my-2">
          <Row className="my-3">
            <h5>{header}</h5>
            <div>
              <span>{description}</span>
            </div>
          </Row>
          <Row className="mt-1 ps-2">{cs}</Row>
          <Row>
            <span className="text-muted text-end">module-name-v1.0.0</span>
          </Row>
        </Container>
      </Form>
    );
  },

  CreateSwitch(
    spec: DisplayConfigElement,
    configuration: { [url: string]: unknown },
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void
  ) {
    const { url, text, tooltip } = spec;
    const { [url]: value } = configuration;
    return (
      <Form.Switch
        className="my-3"
        // Tooltip stuff
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        title={tooltip}
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
      />
    );
  },

  CreateNumberInputElement(
    spec: DisplayConfigElement,
    configuration: { [url: string]: unknown },
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void
  ) {
    const { url, text, tooltip, min, max } =
      spec as NumberInputDisplayConfigElement;
    const { [url]: value } = configuration;
    return (
      <Form.Group className="d-flex align-items-baseline lh-sm">
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
            title={tooltip}
            // End of tooltip stuff
            value={value === undefined ? 0 : (value as number)}
            onChange={(event) => {
              setConfiguration({
                key: url,
                value: parseInt(event.target.value, 10),
                reset: false,
              });
            }}
          />
        </div>
        <div className="flex-grow-1 px-2">
          <Form.Label>{text}</Form.Label>
        </div>
      </Form.Group>
    );
  },

  CreateUIElement(args: {
    spec: DisplayConfigElement;
    configuration: { [key: string]: unknown };
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void;
  }) {
    const { spec, configuration, setConfiguration } = args;
    if (spec.type === 'GroupBox') {
      return UIFactory.CreateGroupBox(spec, configuration, setConfiguration);
    }
    if (spec.type === 'Switch') {
      return UIFactory.CreateSwitch(spec, configuration, setConfiguration);
    }
    if (spec.type === 'Number') {
      return UIFactory.CreateNumberInputElement(
        spec,
        configuration,
        setConfiguration
      );
    }
    return <div />;
  },

  CreateSection(args: {
    level: number;
    header: string;
    contents: SectionDescription;
    identifier: string;
    configuration: { [key: string]: unknown };
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void;
  }) {
    const {
      level,
      identifier,
      header,
      contents,
      configuration,
      setConfiguration,
    } = args;
    const elements = (contents.elements as DisplayConfigElement[]).map(
      (el: DisplayConfigElement) => {
        return (
          <UIFactory.CreateUIElement
            spec={el as DisplayConfigElement}
            configuration={configuration}
            setConfiguration={setConfiguration}
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
    // const elementsIndex = childKeys.indexOf('elements');
    // if (elementsIndex !== -1) {
    //   childKeys.splice(elementsIndex, 1);
    // }

    const children = childKeys.map((key) => {
      return (
        <UIFactory.CreateSection
          level={level + 1}
          header={key}
          contents={contents.sections[key]}
          identifier={`${identifier}-${key}`}
          configuration={configuration}
          setConfiguration={setConfiguration}
        />
      );
    });

    return (
      <div style={{ marginLeft: `${level / 4}rem` }}>
        {htmlHeader}
        <div style={{ marginLeft: '0.5rem', marginBottom: '0.5rem' }}>
          {elements}
        </div>
        {children}
      </div>
    );
  },

  CreateSectionsNav(args: { spec: SectionDescription }) {
    const { spec } = args;

    function createNavSection(
      subspec: SectionDescription,
      header: string,
      href: string,
      depth: number
    ) {
      const iClassName = `nav nav-pills flex-column`;
      const style = { marginLeft: `${depth / 3}rem` };
      return [
        <a className="nav-link" href={href}>
          {header}
        </a>,
        <nav className={iClassName} style={style}>
          {Object.keys(subspec.sections).map((key) => {
            return createNavSection(
              subspec.sections[key],
              key,
              `${href}-${key}`,
              depth + 1
            );
          })}
        </nav>,
      ];
    }

    const level1 = Object.keys(spec.sections).map((key) => {
      return createNavSection(spec.sections[key], key, `#config-${key}`, 1);
    });

    return (
      <nav
        id="config-navbar"
        className="navbar navbar-dark bg-dark flex-column align-items-stretch p-3 col-3"
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
    configuration: { [key: string]: unknown };
    setConfiguration: (args: {
      key: string;
      value: unknown;
      reset: boolean;
    }) => void;
  }) {
    const { definition, configuration, setConfiguration } = args;
    const elements = (definition.elements as DisplayConfigElement[]).map(
      (el: DisplayConfigElement) => {
        return (
          <UIFactory.CreateUIElement
            spec={el as DisplayConfigElement}
            configuration={configuration}
            setConfiguration={setConfiguration}
          />
        );
      }
    );
    const children = Object.keys(definition.sections).map((key) => {
      return (
        <UIFactory.CreateSection
          level={1}
          header={key}
          contents={definition.sections[key]}
          identifier={`config-${key}`}
          configuration={configuration}
          setConfiguration={setConfiguration}
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
          <div>
            <h1 id="config-General">General</h1>
            {elements}
          </div>
          {children}
        </div>
      </>
    );
  },
};

export { UIFactory };
