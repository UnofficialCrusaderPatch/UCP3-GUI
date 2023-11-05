import { DisplayConfigElement } from 'config/ucp/common';
import { SandboxArgs, SandboxMenu } from 'components/sandbox-menu/sandbox-menu';
import { useSetOverlayContent } from 'components/overlay/overlay';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
} from 'function/global/global-atoms';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';

function CreateCustomMenu(args: {
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

  const setOverlayContent = useSetOverlayContent<SandboxArgs>();
  const currentFolder = useCurrentGameFolder();

  const { spec, disabled } = args;
  const { url, text, tooltip, enabled, header } = spec;
  let { [url]: value } = configuration as {
    [url: string]: { enabled: boolean; sliderValue: number };
  };
  const { [url]: defaultValue } = configurationDefaults as {
    [url: string]: { enabled: boolean; sliderValue: number };
  };
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;
  const { hasHeader } = spec as DisplayConfigElement & {
    hasHeader: boolean;
  };

  if (value === undefined) {
    console.error(`value not defined (no default specified?) for: ${url}`);

    if (defaultValue === undefined) {
      console.error(`default value not defined for: ${url}`);
    }

    console.log(`default value for ${url}:`);
    console.log(defaultValue);
    value = defaultValue;
  }

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
            // TODO: improve setup
            setOverlayContent(SandboxMenu, {
              sourcePaths: {
                // TODO: create method to receive paths
                htmlPath: `${currentFolder}/ucp/modules/inputHandler-0.1.0/menu/test.html`,
                cssPath: `${currentFolder}/ucp/modules/inputHandler-0.1.0/menu/test.css`,
                jsPath: `${currentFolder}/ucp/modules/inputHandler-0.1.0/menu/test.js`,
              },
              receiveConfig(config: Record<string, unknown>) {
                // this approach might not be working well, since this sets something else than the master url
                // also, this likely will close on "save" actions
                setConfiguration({
                  type: 'set-multiple',
                  value: config,
                });
                setConfigurationTouched({
                  type: 'set-multiple',
                  value: Object.fromEntries(
                    Object.keys(config).map((key) => [key, true]),
                  ),
                });
              },
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
