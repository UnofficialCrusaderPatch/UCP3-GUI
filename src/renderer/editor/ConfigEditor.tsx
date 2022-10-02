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

import React, { Component, useContext, useReducer, useState } from 'react';

import './ConfigEditor.css';

import { GlobalState } from '../GlobalState';
import {
  UIFactory,
  DisplayConfigElement,
  SectionDescription,
} from './factory/UIElements';

import { ucpBackEnd } from '../fakeBackend';

function saveConfig(
  configuration: { [key: string]: unknown },
  folder: string,
  touched: { [key: string]: boolean }
) {
  const finalConfig = Object.fromEntries(
    Object.entries(configuration).filter(([key]) => touched[key])
  );

  console.log(finalConfig);

  ucpBackEnd.saveUCPConfig(finalConfig, folder);
}

export default function ConfigEditor(args: { readonly: boolean, gameFolder: string }) {
  const { readonly, gameFolder } = args;
  const {
    uiDefinition,
    configurationDefaults,
    file,
    configurationWarnings,
    configuration,
    setConfiguration,
    configurationTouched,
    setConfigurationTouched,
  } = useContext(GlobalState);

  const warningCount = Object.values(configurationWarnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'warning' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(configurationWarnings)
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
                  await ucpBackEnd.loadConfigFromFile(gameFolder);

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
                  value: configurationDefaults,
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
                setConfigurationTouched({
                  type: 'set-multiple',
                  value: Object.fromEntries(
                    Object.entries(newConfiguration).map(([key]) => [key, true])
                  ),
                });
              }}
            >
              Import
            </button>
            <button
              disabled={Object.keys(configurationTouched).length === 0}
              className="col-auto btn btn-primary mx-1"
              type="button"
              onClick={() =>
                saveConfig(
                  configuration,
                  file, // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`,
                  configurationTouched
                )
              }
            >
              Save
            </button>
            <button
              disabled={Object.keys(configurationTouched).length === 0}
              className="col-auto btn btn-primary mx-1"
              type="button"
              onClick={() =>
                saveConfig(
                  configuration,
                  '', // `${getCurrentFolder()}\\ucp3-gui-config-poc.yml`
                  configurationTouched
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
                  value: configurationDefaults,
                });
                setConfigurationTouched({
                  type: 'reset',
                  value: {},
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
        <UIFactory.CreateSections readonly={readonly} />
      </div>
    </>
  );
}
