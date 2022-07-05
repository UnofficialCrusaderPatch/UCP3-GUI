import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { Form } from 'react-bootstrap';
import ToggleButton from 'react-bootstrap/ToggleButton';

import ConfigEditor from './editor/ConfigEditor';

import { DisplayConfigElement } from './editor/factory/UIElements';

function getCurrentFolder() {
  const i = global.location.search.indexOf('?editor=');
  if (i === -1) return 'undefined';
  return global.location.search.substring(i + '?editor'.length + 1);
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

if (global.location.search.startsWith('?editor')) {
  definition = window.electron.ucpBackEnd.getYamlDefinition(getCurrentFolder());
  defaults = getConfigDefaults(definition.flat as unknown[]);
}

export default function Manager() {
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
          <Tab
            eventKey="config"
            title="Config creator"
            className="tabpanel-config"
          >
            <ConfigEditor
              folder={getCurrentFolder()}
              file={`${getCurrentFolder()}/ucp-config-poc.yml`}
              definition={definition}
              defaults={defaults}
            />
          </Tab>
          <Tab eventKey="extensions" title="Extensions">
            ...
          </Tab>
        </Tabs>

        <div className="fixed-bottom bg-primary">
          <div className="d-flex p-1 px-2">
            <div className="flex-grow-1">
              <span className="muted-text">
                folder:
                <span className="px-2 fst-italic">{getCurrentFolder()}</span>
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
