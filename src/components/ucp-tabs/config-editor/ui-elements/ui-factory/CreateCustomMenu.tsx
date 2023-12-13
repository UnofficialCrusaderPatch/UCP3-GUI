import { CustomMenuContents, DisplayConfigElement } from 'config/ucp/common';
import { SandboxArgs, SandboxMenu } from 'components/sandbox-menu/sandbox-menu';
import { useSetOverlayContent } from 'components/overlay/overlay';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
} from 'function/configuration/state';
import { useAtomValue } from 'jotai';
import { parseEnabledLogic } from '../enabled-logic';
import ConfigWarning from './ConfigWarning';

function CreateCustomMenu(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const configuration = useAtomValue(CONFIGURATION_REDUCER_ATOM);
  const configurationWarnings = useAtomValue(
    CONFIGURATION_WARNINGS_REDUCER_ATOM,
  );
  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );

  const setOverlayContent = useSetOverlayContent<SandboxArgs>();

  const { spec, disabled } = args;
  const { url, text, enabled, header } = spec;
  const { source } = spec.contents as CustomMenuContents;

  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );

  const hasWarning = configurationWarnings[url] !== undefined;
  const { hasHeader } = spec as DisplayConfigElement & {
    hasHeader: boolean;
  };

  return (
    <div className="col-5" style={{ marginLeft: 0, marginBottom: 0 }}>
      {hasWarning ? (
        <ConfigWarning
          text={configurationWarnings[url].text}
          level={configurationWarnings[url].level}
        />
      ) : null}
      <div>
        <label className="form-check-label" htmlFor={`${url}-sandbox`}>
          {!hasHeader && header}
          {text}
        </label>
      </div>
      <div className="row">
        <button
          type="button"
          id={`${url}-sandbox`}
          className="sandbox-menu-button"
          onClick={() =>
            setOverlayContent(SandboxMenu, {
              baseUrl: url,
              source,
            })
          }
          disabled={!isEnabled || disabled}
        >
          SANDBOX_TEST
        </button>
      </div>
    </div>
  );
}

export default CreateCustomMenu;
