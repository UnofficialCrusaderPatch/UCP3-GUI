import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { Button, Col, Container, Form, ListGroup, Row } from 'react-bootstrap';
import ToggleButton from 'react-bootstrap/ToggleButton';

import { useReducer } from 'react';
import ConfigEditor from './editor/ConfigEditor';

import { DisplayConfigElement } from './editor/factory/UIElements';
import ExtensionManager from './extensionManager/ExtensionManager';

function getCurrentFolder() {
  const s = global.location.hash;
  const i = s.indexOf('editor');
  if (i === -1) {
    return '';
  }
  const part1: string = s.substring(i);

  const i2 = part1.indexOf('directory=');
  if (i2 === -1) {
    return '';
  }

  return part1.substring(i2 + 'directory='.length);
}

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

let definition: { flat: object[]; hierarchical: object };
let defaults: { [key: string]: unknown };
let ucpVersion: {
  major: number;
  minor: number;
  patch: number;
  sha: string;
  build: string;
};
let latestUCP3: unknown;

console.log(getCurrentFolder());

if (getCurrentFolder().length > 0) {
  console.log(getCurrentFolder());
  definition = window.electron.ucpBackEnd.getYamlDefinition(getCurrentFolder());
  defaults = getConfigDefaults(definition.flat as unknown[]);
  console.log('used definition', definition);
  console.log(
    'extensions',
    window.electron.ucpBackEnd.getExtensions(getCurrentFolder())
  );

  ucpVersion = window.electron.ucpBackEnd.getUCPVersion(getCurrentFolder());
  console.log(ucpVersion);
}

export default function Manager() {
  const extensions = window.electron.ucpBackEnd.getExtensions(
    getCurrentFolder()
  );

  const warningDefaults = {
    'ucp.o_default_multiplayer_speed': {
      text: 'ERROR: Conflicting options selected: test warning',
      level: 'error',
    },
  };

  const [warnings, setWarning] = useReducer(
    (
      state: { [key: string]: unknown },
      action: { key: string; value: unknown; reset: boolean }
    ) => {
      const result: { [key: string]: unknown } = { ...state };
      if (action.reset) {
        // Reset to a value
        if (typeof action.value === 'object') {
          return { ...(result.value as object) };
        }

        // Reset to defaults
        return { ...warningDefaults };
      }
      result[action.key] = action.value;

      return result;
    },
    warningDefaults
  );

  const warningCount = Object.values(warnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'warning' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(warnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'error' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="editor-app m-3 fs-7">
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
              <Button type="button" className="btn btn-primary">
                Install UCP to folder
              </Button>
            </div>
            <div className="m-3">
              <button type="button" className="btn btn-primary disabled">
                Uninstall UCP from this folder
              </button>
            </div>
          </Tab>
          <Tab eventKey="extensions" title="Extensions">
            <ExtensionManager
              extensions={
                extensions as [
                  {
                    definition: {
                      name: string;
                      version: string;
                      author: string;
                    };
                  }
                ]
              }
            />
          </Tab>
          <Tab
            eventKey="config"
            title="User Config"
            className="tabpanel-config"
          >
            <ConfigEditor
              folder={getCurrentFolder()}
              file={`${getCurrentFolder()}/ucp-config-poc.yml`}
              definition={definition}
              defaults={defaults}
              readonly={false}
              warnings={
                warnings as { [key: string]: { text: string; level: string } }
              }
              setWarning={setWarning}
            />
          </Tab>
        </Tabs>

        <div className="fixed-bottom bg-primary">
          <div className="d-flex p-1 px-2 fs-8">
            <div className="flex-grow-1">
              <span className="">
                folder:
                <span className="px-2 fst-italic">{getCurrentFolder()}</span>
              </span>
            </div>
            <div>
              <span className="px-2">0 messages</span>
              <span className="px-2">{warningCount} warnings</span>
              <span className="px-2">{errorCount} errors</span>
              <span className="px-2">GUI version: 1.0.0</span>
              <span className="px-2">
                UCP version:{' '}
                {`${ucpVersion.major}.${ucpVersion.minor}.${
                  ucpVersion.patch
                } - ${ucpVersion.sha.substring(0, 8)}`}
              </span>
              <span className="px-2">UCP active: true</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
