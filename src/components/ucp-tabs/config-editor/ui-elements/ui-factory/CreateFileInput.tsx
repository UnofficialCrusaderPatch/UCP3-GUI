import { Button, Form } from 'react-bootstrap';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { MouseEvent, useMemo, useRef, useState } from 'react';
import {
  openFileDialog,
  openFolderDialog,
} from '../../../../../tauri/tauri-dialog';

import {
  FileInputContents,
  FileInputDisplayConfigElement,
} from '../../../../../config/ucp/common';

import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import {
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../function/configuration/state';

import { useCurrentGameFolder } from '../../../../../function/game-folder/utils';

import Logger from '../../../../../util/scripts/logging';
import { showModalOkCancel } from '../../../../modals/modal-ok-cancel';
import { getStore } from '../../../../../hooks/jotai/base';
import { parseEnabledLogic } from '../enabled-logic';
import { formatToolTip } from '../tooltips';
import ConfigWarning from './ConfigWarning';
import { createStatusBarMessage } from './StatusBarMessage';
import { ConfigPopover } from './popover/ConfigPopover';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
} from '../../../../../function/configuration/derived-state';
import { ACTIVE_EXTENSIONS_FULL_ATOM } from '../../../../../function/extensions/state/focus';

const LOGGER = new Logger('CreateFileInput.tsx');

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
  const [configuration, setConfiguration] = useAtom(
    CONFIGURATION_FULL_REDUCER_ATOM,
  );
  const setUserConfiguration = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);
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
              .get(ACTIVE_EXTENSIONS_FULL_ATOM)
              .map((ex) => ex.name)
              .indexOf(extensionName) === -1;
          if (isNotListed) {
            if (
              !(await showModalOkCancel({
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
    setUserConfiguration({
      type: 'set-multiple',
      value: Object.fromEntries([[url, finalPath]]),
    });
    setConfiguration({
      type: 'set-multiple',
      value: Object.fromEntries([[url, finalPath]]),
    });
    setConfigurationTouched({
      type: 'set-multiple',
      value: Object.fromEntries([[url, true]]),
    });
  };

  const [showPopover, setShowPopover] = useState(false);
  const ref = useRef(null);

  return (
    <Form.Group
      className={`ui-element ${(spec.style || {}).className} ${className}`}
      onMouseEnter={() => {
        setShowPopover(true);
        setStatusBarMessage(statusBarMessage);
      }}
      onMouseLeave={() => {
        setShowPopover(false);
        setStatusBarMessage(undefined);
      }}
      ref={ref}
      style={(spec.style || {}).css}
    >
      <ConfigPopover show={showPopover} url={url} theRef={ref} />
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
