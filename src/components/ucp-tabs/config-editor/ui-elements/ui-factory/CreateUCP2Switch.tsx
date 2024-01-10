import { Accordion } from 'react-bootstrap';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState, useRef } from 'react';
import { DisplayConfigElement } from '../../../../../config/ucp/common';

import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import {
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
} from '../../../../../function/configuration/state';
import { parseEnabledLogic } from '../enabled-logic';
import { createStatusBarMessage } from './StatusBarMessage';
import { ConfigPopover } from './popover/ConfigPopover';

function CreateUCP2Switch(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useAtom(
    CONFIGURATION_FULL_REDUCER_ATOM,
  );
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
  const { url, text, enabled, header } = spec;
  const { [url]: value } = configuration;
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
          setConfiguration({
            type: 'set-multiple',
            value: Object.fromEntries([[url, event.target.checked]]),
          });
          setConfigurationTouched({
            type: 'set-multiple',
            value: Object.fromEntries([[url, true]]),
          });
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

  return (
    <Accordion
      bsPrefix="ucp-accordion"
      className="col"
      style={{ marginLeft: 0, marginBottom: 0 }}
      onMouseEnter={() => {
        setShowPopover(true);
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setShowPopover(false);
        setStatusBarMessage(undefined);
      }}
      ref={ref}
    >
      <ConfigPopover show={showPopover} url={url} theRef={ref} />
      <Accordion.Header as="div">{headerElement}</Accordion.Header>
      <Accordion.Body>{text}</Accordion.Body>
    </Accordion>
  );
}

export default CreateUCP2Switch;
