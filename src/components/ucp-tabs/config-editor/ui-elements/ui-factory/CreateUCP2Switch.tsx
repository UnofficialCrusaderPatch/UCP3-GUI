import 'components/ucp-tabs/config-editor/ui-elements/ui-factory/specified/specified.css';

import { Accordion } from 'react-bootstrap';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState, useRef, useEffect } from 'react';
// eslint-disable-next-line import/no-cycle
import CreateUIElement from './CreateUIElement';
import { UCP2SwitchDisplayConfigElement } from '../../../../../config/ucp/common';

import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../function/configuration/state';
import { parseEnabledLogic } from '../enabled-logic';
import { createStatusBarMessage } from './StatusBarMessage';
import { ConfigPopover } from './popover/ConfigPopover';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
} from '../../../../../function/configuration/derived-state';
import Logger from '../../../../../util/scripts/logging';
import { createSpecifiedStyleIfSpecifiedAndTouched } from './specified/SpecifiedStyle';

const LOGGER = new Logger('CreateUCP2Switch.tsx');

function CreateUCP2Switch(args: {
  spec: UCP2SwitchDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useAtom(
    CONFIGURATION_FULL_REDUCER_ATOM,
  );
  const setUserConfiguration = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);
  const setConfigurationTouched = useSetAtom(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );
  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );
  const configurationLocks = useAtomValue(CONFIGURATION_LOCKS_REDUCER_ATOM);
  const configurationSuggestions = useAtomValue(
    CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
  );

  const { spec, disabled } = args;
  const { url, text, enabled, header, children = [] } = spec;
  let { [url]: value } = configuration;
  const { [url]: defaultValue } = configurationDefaults;

  if (value === undefined) {
    LOGGER.msg(`value not defined (no default specified?) for: ${url}`).error();

    if (defaultValue === undefined) {
      const err = `value and default value not defined for: ${url}`;
      LOGGER.msg(err).error();
      throw Error(err);
    } else {
      LOGGER.msg(`default value for ${url}: {}`, defaultValue).debug();
      value = defaultValue;
    }
  }

  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );

  const statusBarMessage = createStatusBarMessage(
    disabled,
    !isEnabled,
    configurationLocks[url] !== undefined,
    enabled,
    configurationLocks[url],
    configurationSuggestions[url] !== undefined,
    configurationSuggestions[url],
  );
  const isDisabled =
    disabled || !isEnabled || configurationLocks[url] !== undefined;

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(value === true);
  useEffect(() => {
    setExpanded(value === true);
  }, [value]);

  // const hasWarning = configurationWarnings[url] !== undefined;

  const headerElement = (
    <div className="sword-checkbox ucp2-switch">
      <input
        type="checkbox"
        className="me-2"
        id={`${url}`}
        key={`${url}-switch`}
        checked={value === undefined ? false : (value as boolean)}
        onChange={(event) => {
          setUserConfiguration({
            type: 'set-multiple',
            value: Object.fromEntries([[url, event.target.checked]]),
          });
          setConfiguration({
            type: 'set-multiple',
            value: Object.fromEntries([[url, event.target.checked]]),
          });
          setConfigurationTouched({
            type: 'set-multiple',
            value: Object.fromEntries([[url, true]]),
          });
          if (hasChildren) setExpanded(event.target.checked);
        }}
        disabled={isDisabled}
      />
      <label className="fs-6" htmlFor={`${url}`}>
        {header}
      </label>
    </div>
  );

  const [showPopover, setShowPopover] = useState(false);
  const ref = useRef(null);

  const noText = text === null || text === undefined;

  const configurationTouched = useAtomValue(CONFIGURATION_TOUCHED_REDUCER_ATOM);
  const userConfiguration = useAtomValue(CONFIGURATION_USER_REDUCER_ATOM);
  const specifiedStyle = createSpecifiedStyleIfSpecifiedAndTouched(
    userConfiguration,
    configurationTouched,
    url,
  );

  return (
    <Accordion
      bsPrefix="ucp-accordion ui-element"
      className={`col sword-checkbox ${(spec.style || {}).className} ${specifiedStyle}`}
      style={{ marginLeft: 0, marginBottom: 0, ...(spec.style || {}).css }}
      onMouseEnter={() => {
        if (isEnabled) {
          setShowPopover(true);
          setStatusBarMessage(statusBarMessage);
        }
      }}
      onMouseLeave={() => {
        setShowPopover(false);
        setStatusBarMessage(undefined);
      }}
      ref={ref}
    >
      <ConfigPopover show={showPopover} url={url} theRef={ref} />
      {hasChildren ? (
        <Accordion
          activeKey={expanded ? 'options' : null}
          onSelect={(key) => setExpanded(key === 'options')}
          bsPrefix="ucp-accordion"
        >
          <Accordion.Item eventKey="options" bsPrefix="ucp-switch-options">
            <div className="d-flex align-items-center">
              <Accordion.Button
                className="w-auto flex-shrink-0 p-0 me-2"
                aria-label={header}
              />
              {headerElement}
            </div>
            <Accordion.Body>
              {text && <div>{text}</div>}
              {children.map((child) => (
                <CreateUIElement
                  key={
                    child.name ||
                    ('url' in child ? child.url : JSON.stringify(child))
                  }
                  spec={child}
                  disabled={isDisabled || value !== true}
                  className=""
                />
              ))}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      ) : (
        <>
          <Accordion.Header
            bsPrefix={`ucp-accordion-header ucp-accordion-header-${noText ? 'no-button' : 'left-button'}`}
            as="div"
          >
            {headerElement}
          </Accordion.Header>
          <Accordion.Body>{text}</Accordion.Body>
        </>
      )}
    </Accordion>
  );
}

export default CreateUCP2Switch;
