import 'components/ucp-tabs/config-editor/ui-elements/ui-factory/specified/specified.css';

import { useState } from 'react';
import { useAtomValue } from 'jotai';

import {
  CustomMenuContents,
  CustomMenuDisplayConfigElement,
  DisplayConfigElement,
  Extension,
} from '../../../../../config/ucp/common';
import {
  SandboxArgs,
  SandboxMenu,
  SandboxSource,
  SandboxSourcePaths,
} from '../../../../sandbox-menu/sandbox-menu';
import { setOverlayContent } from '../../../../overlay/overlay';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
} from '../../../../../function/configuration/state';

import { ExtensionHandle } from '../../../../../function/extensions/handles/extension-handle';
import Logger from '../../../../../util/scripts/logging';

import { parseEnabledLogic } from '../enabled-logic';
import ConfigWarning from './ConfigWarning';
import Message from '../../../../general/message';
import { LANGUAGE_ATOM } from '../../../../../function/gui-settings/settings';
import { CONFIGURATION_DEFAULTS_REDUCER_ATOM } from '../../../../../function/configuration/derived-state';
import { createSpecifiedStyleIfSpecifiedAndTouched } from './specified/SpecifiedStyle';

const LOGGER = new Logger('CreateCustomMenu.tsx');

async function receiveSource(handle: ExtensionHandle, source: string) {
  if (!source) {
    return '';
  }
  return handle.getTextContents(`menu/${source}`).catch((e) => {
    LOGGER.msg(
      'Unable to load source "{}" from menu path of extension with path "{}": {}',
      source,
      handle.path,
      e,
    ).warn();
    return '';
  });
}

async function receiveSources(
  extension: Extension,
  sourcePaths: SandboxSourcePaths,
): Promise<SandboxSource> {
  return extension.io
    .handle((handle) =>
      Promise.all([
        receiveSource(handle, sourcePaths.html),
        receiveSource(handle, sourcePaths.css),
        receiveSource(handle, sourcePaths.js),
      ]),
    )
    .then((sourceStrings) =>
      // should these be sanitized?
      ({
        html: sourceStrings[0],
        css: sourceStrings[1],
        js: sourceStrings[2],
      }),
    );
}

function CreateCustomMenu(args: {
  spec: CustomMenuDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const configuration = useAtomValue(CONFIGURATION_FULL_REDUCER_ATOM);
  const configurationWarnings = useAtomValue(
    CONFIGURATION_WARNINGS_REDUCER_ATOM,
  );
  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );
  const currentLanguage = useAtomValue(LANGUAGE_ATOM);

  const [activatingMenu, setActivatingMenu] = useState(false);

  const { spec, disabled } = args;
  const { url, text, enabled, header, extension } = spec;
  const { source: sourcePaths } = spec.contents as CustomMenuContents;

  const isEnabled = parseEnabledLogic(
    enabled,
    configuration,
    configurationDefaults,
  );

  const hasWarning = configurationWarnings[url] !== undefined;
  const { hasHeader } = spec as DisplayConfigElement & {
    hasHeader: boolean;
  };

  const configurationTouched = useAtomValue(CONFIGURATION_TOUCHED_REDUCER_ATOM);
  const userConfiguration = useAtomValue(CONFIGURATION_USER_REDUCER_ATOM);
  const specifiedStyle = createSpecifiedStyleIfSpecifiedAndTouched(
    userConfiguration,
    configurationTouched,
    url,
  );

  return (
    <div
      style={(spec.style || {}).css}
      className={`${(spec.style || {}).className} ${specifiedStyle}`}
    >
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
      <div>
        <button
          type="button"
          id={`${url}-sandbox`}
          className="ucp-button sandbox-menu-button"
          onClick={async () => {
            setActivatingMenu(true);
            setOverlayContent<SandboxArgs>(SandboxMenu, false, false, {
              baseUrl: url,
              source: await receiveSources(extension, sourcePaths),
              localization: extension.locales[currentLanguage] ?? {},
              fallbackLocalization: extension.locales.en ?? {},
              title: hasHeader ? header : undefined,
            });
            setActivatingMenu(false);
          }}
          disabled={!isEnabled || disabled || activatingMenu}
        >
          <Message message="sandbox.open" />
        </button>
      </div>
    </div>
  );
}

export default CreateCustomMenu;
