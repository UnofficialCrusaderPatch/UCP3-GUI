/* eslint-disable react/no-unescaped-entities */
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

import React, { Component, useReducer, useState } from 'react';

import './Editor.css';
import { Form } from 'react-bootstrap';

function getConfigDefaults(yml: unknown[]) {
  const result: { [url: string]: unknown } = {};

  function yieldDefaults(part: any | DisplayConfigElement): void {
    if (typeof part === 'object') {
      if (Object.keys(part).indexOf('url') > -1) {
        result[part.url as string] = part.default;
      }
      if (Object.keys(part).indexOf('children') > -1) {
        part.children.forEach((child: unknown) => yieldDefaults(child));
      }
    }
  }

  yml.forEach((element: unknown) => yieldDefaults(element));

  return result;
}

function getCurrentFolder() {
  const i = global.location.search.indexOf('?editor=');
  if (i === -1) return 'undefined';
  return global.location.search.substring(i + '?editor'.length + 1);
}

console.log(global.location.search);

type DisplayConfigElement = {
  name: string;
  description: string;
  text: string;
  type: string;
  children: DisplayConfigElement[];
  default: unknown;
  url: string;
  columns: number;
};

// const dummyYaml = Object.values(
//   window.electron.ucpBackEnd.getYamlDefinition(currentFolder)
// );

// TODO: this is a dummy
// const activeConfigurationDefaults = getConfigDefaults(dummyYaml);
// const activeConfiguration = JSON.parse(
//  JSON.stringify(activeConfigurationDefaults)
// );

let activeConfiguration = {};
let activeConfigurationDefaults = {};

function getActiveConfig(): { [url: string]: unknown } {
  return activeConfiguration;
}

function getActiveDefaultConfig(): { [url: string]: unknown } {
  return activeConfigurationDefaults;
}

const EditorTemplate = () => {
  activeConfigurationDefaults = getConfigDefaults(
    window.electron.ucpBackEnd.getYamlDefinition(getCurrentFolder())
  );
  activeConfiguration = JSON.parse(JSON.stringify(activeConfigurationDefaults));

  // const [configuration, dispatch] = useReducer(() => {
  // }, getActiveDefaultConfig());
  const [configuration, setConfiguration] = useState(getActiveDefaultConfig());

  function CreateUIElement(args: { [spec: string]: DisplayConfigElement }) {
    let { spec } = args;
    spec = spec as DisplayConfigElement;
    if (spec.type === 'GroupBox') {
      const itemCount = spec.children.length;
      const rows = Math.ceil(itemCount / spec.columns);

      const children = [];

      for (let row = 0; row < rows; row += 1) {
        const rowChildren = [];
        for (
          let i = spec.columns * row;
          i < Math.min(spec.columns * (row + 1), spec.children.length);
          i += 1
        ) {
          rowChildren.push(
            <Col>
              <CreateUIElement spec={spec.children[i]} />
            </Col>
          );
        }
        children.push(<Row>{rowChildren}</Row>);
      }

      return (
        <Form key={`${spec.name}-groupbox`}>
          <Container className="border-bottom border-light">
            <Row className="mb-3">
              <div>
                <span>{spec.description}</span>
              </div>
            </Row>
            <Row className="mb-3">{children}</Row>
          </Container>
        </Form>
      );
    }
    if (spec.type === 'Switch') {
      // return React.createElement(Form.Switch, {
      //   key: `${spec.url}-switch`,
      //   label: spec.text,
      //   id: `${spec.url}-switch`,
      //   defaultChecked: spec.default as boolean,
      //   onChange: (event) => {
      //     getActiveConfig()[spec.url] = event.target.checked;
      //     console.log(spec.url, event.target.checked);
      //   },
      // });
      return (
        <Form.Switch
          key={`${spec.url}-switch`}
          label={spec.text}
          id={`${spec.url}-switch`}
          checked={
            configuration[spec.url] === undefined
              ? (getActiveDefaultConfig()[spec.url] as boolean)
              : (configuration[spec.url] as boolean)
          }
          onChange={(event) => {
            const c = JSON.parse(JSON.stringify(configuration));
            console.log(c);
            c[spec.url] = event.target.checked;
            console.log(spec.url, event.target.checked);
            setConfiguration(c);
            console.log(c);
          }}
        />
      );
      return (
        <Form.Switch
          key={`${spec.url}-switch`}
          label={spec.text}
          id={`${spec.url}-switch`}
          defaultChecked={getActiveConfig()[spec.url] as boolean}
          onChange={(event) => {
            getActiveConfig()[spec.url] = event.target.checked;
            console.log(spec.url, event.target.checked);
          }}
        />
      );
    }
    return <div />;
  }

  return (
    <div className="editor-app m-3">
      <div className="col-12">
        <Tabs
          defaultActiveKey="config"
          id="uncontrolled-tab-example"
          className="mb-3"
        >
          <Tab eventKey="overview" title="Overview">
            <Form className="m-3">
              <Form.Switch id="activate-ucp-switch" label="Activate UCP" />
            </Form>
            <div className="m-3">
              <button type="button" className="btn btn-primary">
                Install UCP to folder
              </button>
            </div>
            <div className="m-3">
              <button type="button" className="btn btn-primary disabled">
                Uninstall UCP from this folder
              </button>
            </div>
            <div className="m-3">
              <ToggleButton
                className="mb-2"
                id="activate-toggle-check"
                type="checkbox"
                variant="outline-primary"
                value="1"
              >
                Activate UCP
              </ToggleButton>
            </div>
          </Tab>
          <Tab eventKey="config" title="Config">
            <div id="dynamicContent">
              {window.electron.ucpBackEnd
                .getYamlDefinition(getCurrentFolder())
                .map((x: unknown) => {
                  return <CreateUIElement spec={x as DisplayConfigElement} />;
                })}
            </div>
            <div>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() =>
                  window.electron.ucpBackEnd.saveUCPConfig(
                    configuration,
                    `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`
                  )
                }
              >
                Save
              </button>
            </div>
          </Tab>
          <Tab eventKey="extensions" title="Extensions">
            ...
          </Tab>
        </Tabs>

        <div className="fixed-bottom bg-primary">
          <div className="d-flex p-1 px-2">
            <div className="flex-grow-1">
              <span className="muted-text">
                folder: "
                <span className="px-2 font-italic">{getCurrentFolder()}</span>"
              </span>
            </div>
            <div>
              <span className="muted-text px-2">
                installed UCP version: 3.0.0
              </span>
              <span className="muted-text px-2">UCP active: true</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Editor() {
  return <EditorTemplate />;
}
