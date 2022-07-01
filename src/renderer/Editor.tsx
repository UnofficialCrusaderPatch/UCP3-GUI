/* eslint-disable react/no-unescaped-entities */
/* global CreateUIElement */

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

import {
  UIFactory,
  DisplayConfigElement,
  SectionDescription,
} from './factory/elements';

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

console.log('Editor location: ', global.location.search);

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

const touched: { [url: string]: boolean } = {};
let def: { flat: object[]; hierarchical: object };

if (global.location.search.startsWith('?editor')) {
  def = window.electron.ucpBackEnd.getYamlDefinition(getCurrentFolder());
  activeConfigurationDefaults = getConfigDefaults(def.flat as unknown[]);
  activeConfiguration = JSON.parse(JSON.stringify(activeConfigurationDefaults));
}

export default function Editor() {
  console.log('Create Editor');

  const [configuration, setConfiguration] = useReducer(
    (
      state: { [key: string]: unknown },
      action: { key: string; value: unknown; reset: boolean }
    ) => {
      const result: { [key: string]: unknown } = { ...state };
      if (action.reset) {
        // for enumerable and non-enumerable properties
        Object.getOwnPropertyNames(touched).forEach((prop) => {
          delete touched[prop];
        });
        console.log(touched);
        return { ...activeConfigurationDefaults };
      }
      result[action.key] = action.value;
      touched[action.key] = true;

      console.log(touched);

      return result;
    },
    activeConfigurationDefaults
  );

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
          <Tab eventKey="config" title="Config" className="tabpanel-config">
            <div className="border-bottom border-light pb-2">
              <button
                disabled={Object.keys(touched).length === 0}
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
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  setConfiguration({
                    reset: true,
                    key: '',
                    value: undefined,
                  });
                }}
              >
                Reset
              </button>
            </div>

            <div id="dynamicConfigPanel" className="row w-100 mx-0">
              <UIFactory.CreateSections
                definition={def.hierarchical as SectionDescription}
                configuration={configuration}
                setConfiguration={setConfiguration}
              />
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
}
