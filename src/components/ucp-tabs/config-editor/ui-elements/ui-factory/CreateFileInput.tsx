import { DisplayConfigElement, NumberContents } from 'config/ucp/common';

import { Button, Form } from 'react-bootstrap';
import { STATUS_BAR_MESSAGE_ATOM } from 'function/global/global-atoms';
import {
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
} from 'function/configuration/state';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { openFileDialog } from 'tauri/tauri-dialog';
import { MouseEvent } from 'react';
import Logger from 'util/scripts/logging';
import { useCurrentGameFolder } from 'function/game-folder/state';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';
import { createStatusBarMessage } from './StatusBarMessage';

const LOGGER = new Logger('CreateFileInput.tsx');

export type FileInputDisplayConfigElement = DisplayConfigElement & {
  generalizeExtensionPaths: boolean;
};

const r =
  /^ucp[/](modules|plugins)[/]([a-zA-Z0-9-.]+)-([0-9]+[.][0-9]+[.][0-9]+)[/](.*)/;

function CreateFileInput(args: {
  spec: FileInputDisplayConfigElement;
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
  const { url, text, tooltip, enabled, contents, generalizeExtensionPaths } =
    spec;
  const { min, max } = contents as NumberContents;
  const { [url]: value } = configuration;
  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );
  const fullToolTip = formatToolTip(tooltip, url);

  const hasWarning = configurationWarnings[url] !== undefined;

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

  const gameFolder = useCurrentGameFolder();

  const onClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const pathResult = await openFileDialog(`${gameFolder}`);

    if (!pathResult.isPresent() || pathResult.isEmpty()) return;

    const path = pathResult.get().replaceAll(/[\\]+/g, '/');

    const relativePath = path.substring(
      gameFolder.replaceAll(/[\\]+/g, '/').length + 1,
    );

    LOGGER.msg(relativePath).debug();
    let finalPath = relativePath;

    if (generalizeExtensionPaths) {
      if (
        relativePath.startsWith('ucp/plugins') ||
        relativePath.startsWith('ucp/modules')
      ) {
        const matches = r.exec(relativePath);

        if (matches !== null) {
          finalPath = `ucp/${matches[1]}/${matches[2]}-*/${matches[4]}`;
        }
      }
    }

    setConfiguration({
      type: 'set-multiple',
      value: Object.fromEntries([[url, finalPath]]),
    });
    setConfigurationTouched({
      type: 'set-multiple',
      value: Object.fromEntries([[url, true]]),
    });
  };

  return (
    <Form.Group
      className={`${className}`}
      onMouseEnter={() => {
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {hasWarning ? (
        <ConfigWarning
          text={configurationWarnings[url].text}
          level={configurationWarnings[url].level}
        />
      ) : null}
      <Form.Label
        className="mb-0 mt-1"
        htmlFor={`${url}-input`}
        // Tooltip stuff
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        title={fullToolTip}
        // End of tooltip stuff
        disabled={isDisabled}
      >
        {text}
      </Form.Label>
      <div className={`d-flex align-items-baseline lh-sm my-1 ${className}`}>
        <Button
          className="bg-dark text-light fs-7 lh-1"
          onClick={onClick}
          disabled={isDisabled}
        >
          Browse
        </Button>
        <Form.Control
          id={`${url}-input`}
          key={`${url}-input`}
          type="text"
          className="fs-7 lh-1"
          // Tooltip stuff
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title={fullToolTip}
          // End of tooltip stuff
          defaultValue={value as string}
          onChange={(event) => {}}
          disabled
          readOnly
        />
      </div>
    </Form.Group>
  );
}

export default CreateFileInput;
