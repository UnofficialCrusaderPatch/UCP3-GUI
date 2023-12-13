import { Form } from 'react-bootstrap';
import { DisplayConfigElement } from 'config/ucp/common';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { STATUS_BAR_MESSAGE_ATOM } from 'components/footer/footer';
import {
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
} from 'function/configuration/state';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import { createStatusBarMessage } from './StatusBarMessage';

function CreateUCP2Switch(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useAtom(CONFIGURATION_REDUCER_ATOM);
  const configurationWarnings = useAtomValue(
    CONFIGURATION_WARNINGS_REDUCER_ATOM,
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

  const { spec, disabled, className } = args;
  const { url, text, tooltip, enabled, header } = spec;
  const { [url]: value } = configuration;
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );
  const fullToolTip = formatToolTip(tooltip, url);

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

  const hasWarning = configurationWarnings[url] !== undefined;
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

  return (
    <div
      className="col"
      style={{ marginLeft: 0, marginBottom: 0 }}
      onMouseEnter={() => {
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {headerElement}
      {text}
    </div>
  );
}

export default CreateUCP2Switch;
