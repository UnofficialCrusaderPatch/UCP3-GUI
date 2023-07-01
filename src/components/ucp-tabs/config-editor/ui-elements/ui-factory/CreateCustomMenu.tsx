import {
  useConfigurationDefaults,
  useConfigurationReducer,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';
import { DisplayConfigElement } from 'config/ucp/common';
import { SandboxArgs, SandboxMenu } from 'components/sandbox-menu/sandbox-menu';
import { useSetOverlayContent } from 'components/overlay/overlay';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';

function CreateCustomMenu(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useConfigurationReducer();
  const configurationWarnings = useConfigurationWarnings();
  const setConfigurationTouched = useSetConfigurationTouched();
  const configurationDefaults = useConfigurationDefaults();

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
    configurationDefaults
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
        <label className="form-check-label" htmlFor={`${url}-slider`}>
          {!hasHeader && header}
          {text}
        </label>
      </div>
      <div className="row">
        <button
          type="button"
          className="sandbox-menu-button"
          onClick={() =>
            // TODO: improve setup
            setOverlayContent(SandboxMenu, {
              url,
              sourcePaths: {
                // TODO: create method to receive paths
                htmlPath: `${currentFolder}/ucp/modules/inputHandler-0.1.0/menu/test.html`,
                cssPath: `${currentFolder}/ucp/modules/inputHandler-0.1.0/menu/test.css`,
                jsPath: `${currentFolder}/ucp/modules/inputHandler-0.1.0/menu/test.js`,
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
