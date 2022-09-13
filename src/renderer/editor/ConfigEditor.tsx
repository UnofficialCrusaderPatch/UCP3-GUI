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

console.log('Load ConfigEditor.tsx');

const touched: { [url: string]: boolean } = {};

export default function ConfigEditor(args: {
  definition: { flat: object[]; hierarchical: object };
  defaults: { [key: string]: unknown };
  file: string;
  folder: string;
  readonly: boolean;
  warnings: { [key: string]: { text: string; level: string } };
  setWarning: (args: { key: string; value: unknown; reset: boolean }) => void;
}) {
  console.log('Create Editor');
  const { definition, defaults, file, readonly, warnings, setWarning } = args;

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

        // Reset to a value
        if (typeof action.value === 'object') {
          console.log('resetted to', action.value);
          return { ...(action.value as object) };
        }

        // Reset to defaults
        return { ...defaults };
      }
      result[action.key] = action.value;
      touched[action.key] = true;

      return result;
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
                const openedConfig =
                  await window.electron.ucpBackEnd.loadConfigFromFile();

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
                  return findValue(
                    obj[key] as { [key: string]: unknown },
                    rest
                  );
                }

                const newConfiguration: { [key: string]: unknown } = {};
                Object.keys(configuration).forEach((url) => {
                  const value = findValue(
                    openedConfig as { [key: string]: unknown },
                    url
                  );
                  newConfiguration[url] = value;
                });

                setConfiguration({
                  reset: true,
                  value: newConfiguration,
                  key: '',
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
                window.electron.ucpBackEnd.saveUCPConfig(
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
                window.electron.ucpBackEnd.saveUCPConfig(
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
                  reset: true,
                  key: '',
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
