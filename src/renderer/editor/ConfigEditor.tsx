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

import './ConfigEditor.css';
import { Form } from 'react-bootstrap';

import {
  UIFactory,
  DisplayConfigElement,
  SectionDescription,
} from './factory/UIElements';

const touched: { [url: string]: boolean } = {};

export default function ConfigEditor(args: {
  definition: { flat: object[]; hierarchical: object };
  defaults: { [key: string]: unknown };
  file: string;
  folder: string;
  readonly: boolean;
}) {
  console.log('Create Editor');
  const { definition, defaults, file, readonly } = args;

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
          return { ...(result.value as object) };
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

  return (
    <>
      {!readonly ? (
        <div className="row border-bottom border-light pb-2 mx-0">
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
            Save As
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
            Reset to Defaults
          </button>
          <Form className="col-auto">
            <Form.Switch id="config-sparse-mode-switch" label="Sparse config" />
          </Form>
        </div>
      ) : null}
      <div id="dynamicConfigPanel" className="row w-100 mx-0">
        <UIFactory.CreateSections
          definition={definition.hierarchical as SectionDescription}
          configuration={configuration}
          setConfiguration={setConfiguration}
          readonly={readonly}
        />
      </div>
    </>
  );
}
