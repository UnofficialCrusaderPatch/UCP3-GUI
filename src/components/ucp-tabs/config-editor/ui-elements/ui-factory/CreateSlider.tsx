import {
  useConfigurationDefaults,
  useConfigurationLocks,
  useConfigurationReducer,
  useConfigurationSuggestions,
  useConfigurationWarnings,
  useSetConfigurationTouched,
} from 'hooks/jotai/globals-wrapper';

import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import RangeSlider from 'react-bootstrap-range-slider';

import { DisplayConfigElement, NumberContents } from 'config/ucp/common';
import { useState } from 'react';
import { STATUS_BAR_MESSAGE_ATOM } from 'function/global/global-atoms';
import { useSetAtom } from 'jotai';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import { createStatusBarMessage } from './StatusBarMessage';

function CreateSlider(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const [configuration, setConfiguration] = useConfigurationReducer();
  const configurationWarnings = useConfigurationWarnings();
  const setConfigurationTouched = useSetConfigurationTouched();
  const configurationDefaults = useConfigurationDefaults();
  const configurationLocks = useConfigurationLocks();
  const configurationSuggestions = useConfigurationSuggestions();

  const { spec, disabled, className } = args;
  const { url, text, tooltip, enabled } = spec;
  const { contents } = spec;
  const { min, max, step } = contents as NumberContents;
  const { [url]: value } = configuration as {
    [url: string]: { enabled: boolean; sliderValue: number };
  };
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;

  // eslint-disable-next-line no-nested-ternary
  const factor = 1 / (step === undefined ? 1 : step === 0 ? 1 : step);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [localValue, setLocalValue] = useState(
    value.sliderValue === undefined
      ? 0
      : (value.sliderValue as number) * factor,
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

  return (
    <div
      onMouseEnter={() => {
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <RangeSlider
        min={min * factor}
        max={max * factor}
        step={step * factor}
        id={`${url}-slider`}
        size="sm"
        value={localValue}
        tooltipLabel={(currentValue) => (currentValue / factor).toString()}
        onChange={(event) => {
          setLocalValue(parseInt(event.target.value, 10));
        }}
        onAfterChange={(event) => {
          setConfiguration({
            type: 'set-multiple',
            value: Object.fromEntries([
              [
                url,
                {
                  ...value,
                  ...{
                    sliderValue: parseInt(event.target.value, 10) / factor,
                  },
                },
              ],
            ]),
          });
          setConfigurationTouched({
            type: 'set-multiple',
            value: Object.fromEntries([[url, true]]),
          });
        }}
        disabled={isDisabled}
      />
    </div>
  );
}

export default CreateSlider;
