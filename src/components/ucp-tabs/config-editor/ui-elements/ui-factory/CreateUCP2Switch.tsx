import {
  useActiveExtensions,
  useConfigurationDefaults,
  useConfigurationLocks,
  useConfigurationReducer,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import { Form } from 'react-bootstrap';
import { DisplayConfigElement } from 'config/ucp/common';

import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';

function CreateUCP2Switch(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useConfigurationReducer();
  const configurationWarnings = useConfigurationWarnings();
  const setConfigurationTouched = useSetConfigurationTouched();
  const configurationDefaults = useConfigurationDefaults();
  const configurationLocks = useConfigurationLocks();

  const { spec, disabled, className } = args;
  const { url, text, tooltip, enabled, header } = spec;
  const { [url]: value } = configuration;
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;
  const headerElement = (
    <Form.Switch className="sword-checkbox">
      <Form.Switch.Input
        className="me-2 test123"
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
        disabled={
          !isEnabled || disabled || configurationLocks[url] !== undefined
        }
      />
      <Form.Switch.Label className="fs-6" htmlFor={`${url}`}>
        {header}
      </Form.Switch.Label>
    </Form.Switch>
  );

  return (
    <div className="col" style={{ marginLeft: 0, marginBottom: 0 }}>
      {headerElement}
      {text}
    </div>
  );
}

export default CreateUCP2Switch;
