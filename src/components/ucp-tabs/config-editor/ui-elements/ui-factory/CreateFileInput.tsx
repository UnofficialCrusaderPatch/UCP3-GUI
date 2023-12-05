import { DisplayConfigElement, FileInputContents } from 'config/ucp/common';

import { Button, Form } from 'react-bootstrap';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
  STATUS_BAR_MESSAGE_ATOM,
} from 'function/global/global-atoms';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { openFileDialog, openFolderDialog } from 'tauri/tauri-dialog';
import { useCurrentGameFolder } from 'hooks/jotai/helper';
import { MouseEvent, useMemo } from 'react';
import Logger from 'util/scripts/logging';
import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';
import { getStore } from 'hooks/jotai/base';
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

const makeRelative = (baseFolder: string, path: string) => {
  const nbase = baseFolder.replaceAll(/[\\]+/g, '/');
  const npath = path.replaceAll(/[\\]+/g, '/');

  const nestedPath = npath.split(nbase)[1];
  if (nestedPath !== undefined) {
    let cleanedPath = nestedPath;
    while (cleanedPath.startsWith('/')) cleanedPath = cleanedPath.substring(1);
    return cleanedPath;
  }
  return `ucp/${npath.split('/ucp/')[1]}`;
};

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
  const { url, text, tooltip, enabled, contents } = spec;
  const { filter, generalizeExtensionPaths } = contents as FileInputContents;
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

  const valueAtom = useMemo(() => atom<string>(`${value}`), [value]);
  const [theValue, setTheValue] = useAtom(valueAtom);

  const onClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    let pathResult;

    if (filter === 'files' || filter === undefined) {
      pathResult = await openFileDialog(`${gameFolder}`);
    } else if (filter === 'folders') {
      pathResult = await openFolderDialog(`${gameFolder}`);
    } else {
      const extensions = filter.split(',').map((v) => v.trim());
      pathResult = await openFileDialog(`${gameFolder}`, [
        {
          name: 'supported extensions',
          extensions,
        },
      ]);
    }

    if (!pathResult.isPresent() || pathResult.isEmpty()) return;

    const path = pathResult.get().replaceAll(/[\\]+/g, '/');

    LOGGER.msg(path).debug();

    const relativePath = makeRelative(gameFolder, path);

    LOGGER.msg(relativePath).debug();

    let finalPath = relativePath;

    if (generalizeExtensionPaths) {
      if (
        relativePath.startsWith('ucp/plugins') ||
        relativePath.startsWith('ucp/modules')
      ) {
        const matches = r.exec(relativePath);

        if (matches !== null) {
          const extensionType = matches[1];
          const extensionName = matches[2];
          const remainder = matches[4];
          finalPath = `ucp/${extensionType}/${extensionName}-*/${remainder}`;

          const isNotListed =
            getStore()
              .get(EXTENSION_STATE_REDUCER_ATOM)
              .activeExtensions.map((ex) => ex.name)
              .indexOf(extensionName) === -1;
          if (isNotListed) {
            if (
              !(await showGeneralModalOkCancel({
                title: 'WARNING: Extension not active',
                message: `The extension "${extensionName}" is not among the active extensions. Make sure to active it. Otherwise, running the game might fail.`,
              }))
            ) {
              return;
            }
          }
        }
      }
    }

    LOGGER.msg(finalPath).debug();

    setTheValue(finalPath);
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
          value={theValue}
          readOnly
        />
      </div>
    </Form.Group>
  );
}

export default CreateFileInput;
