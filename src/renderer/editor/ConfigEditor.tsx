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
import { Form } from 'react-bootstrap';

import React, { Component, useReducer, useState } from 'react';

import './ConfigEditor.css';

import {
  UIFactory,
  DisplayConfigElement,
  SectionDescription,
} from './factory/UIElements';

const touched: { [url: string]: boolean } = {};

function saveConfig(configuration: { [key: string]: unknown }, folder: string) {
  const finalConfig = Object.fromEntries(
    Object.entries(configuration).filter(([key]) => touched[key])
  );

  console.log(finalConfig);

  window.electron.ucpBackEnd.saveUCPConfig(finalConfig, folder);
}

export default function ConfigEditor(args: {
  definition: {
    flat: object[];
    hierarchical: { elements: object[]; sections: { [key: string]: object } };
  };
  defaults: { [key: string]: unknown };
  file: string;
  folder: string;
  readonly: boolean;
  warnings: { [key: string]: { text: string; level: string } };
  setWarning: (args: { key: string; value: unknown; reset: boolean }) => void;
}) {
  const { definition, defaults, file, readonly, warnings, setWarning } = args;

  const [configuration, setConfiguration] = useReducer(
    (
      state: { [key: string]: unknown },
      action: { type: string; value: unknown }
    ) => {
      if (action.type === 'reset') {
        // for enumerable and non-enumerable properties
        Object.getOwnPropertyNames(touched).forEach((prop) => {
          delete touched[prop];
        });

        // Reset to defaults
        return { ...defaults };
      }
      if (action.type === 'set-multiple') {
        // Reset to a value
        Object.keys(action.value as object).forEach((key) => {
          touched[key] = true;
        });
        return { ...state, ...(action.value as object) };
      }
      throw new Error(`Unknown configuration action type: ${action.type}`);
    },
    defaults
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
    <>
      {!readonly ? (
        <div className="row border-bottom border-light pb-2 mx-0">
          <div className="col">
            <button
              className="col-auto btn btn-primary mx-1"
              type="button"
              onClick={async () => {
                const openedConfig: { [key: string]: unknown } =
                  await window.electron.ucpBackEnd.loadConfigFromFile();

                if (openedConfig === undefined) return;

                function findValue(
                  obj: { [key: string]: unknown },
                  url: string
                ): unknown {
                  const dot = url.indexOf('.');
                  if (dot === -1) {
                    return obj[url];
                  }
                  const key = url.slice(0, dot);
                  const rest = url.slice(dot + 1);

                  if (obj[key] === undefined) return undefined;

                  return findValue(
                    obj[key] as { [key: string]: unknown },
                    rest
                  );
                }

                setConfiguration({
                  type: 'reset',
                  value: undefined,
                });

                const newConfiguration: { [key: string]: unknown } = {};
                Object.keys(configuration).forEach((url) => {
                  const value = findValue(
                    openedConfig as { [key: string]: unknown },
                    url
                  );
                  if (value !== undefined) {
                    newConfiguration[url] = value;
                  }
                });

                setConfiguration({
                  type: 'set-multiple',
                  value: newConfiguration,
                });
              }}
            >
              Import
            </button>
            <button
              disabled={Object.keys(touched).length === 0}
              className="col-auto btn btn-primary mx-1"
              type="button"
              onClick={() =>
                saveConfig(
                  configuration,
                  file // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`
                )
              }
            >
              Save
            </button>
            <button
              disabled={Object.keys(touched).length === 0}
              className="col-auto btn btn-primary mx-1"
              type="button"
              onClick={() =>
                saveConfig(
                  configuration,
                  '' // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`
                )
              }
            >
              Export
            </button>
            <button
              className="col-auto btn btn-primary mx-1"
              type="button"
              onClick={() => {
                setConfiguration({
                  type: 'reset',
                  value: undefined,
                });
              }}
            >
              Reset
            </button>
            <Form.Switch
              id="config-allow-user-override-switch"
              label="Allow user override"
              className="col-auto d-inline-block ms-1"
            />
          </div>

          <div className="col-auto ml-auto">
            {errorCount > 0 ? (
              <span className="text-danger fs-4 mx-1">⚠</span>
            ) : null}
            <span>{errorCount} errors </span>
            {warningCount > 0 ? (
              <span className="text-warning fs-4 mx-1">⚠</span>
            ) : null}
            <span>{warningCount} warnings</span>
          </div>
        </div>
      ) : null}
      <div id="dynamicConfigPanel" className="row w-100 mx-0">
        <UIFactory.CreateSections
          definition={definition.hierarchical as SectionDescription}
          configuration={configuration}
          setConfiguration={setConfiguration}
          readonly={readonly}
          warnings={warnings}
          setWarning={setWarning}
        />
      </div>
    </>
  );
}
