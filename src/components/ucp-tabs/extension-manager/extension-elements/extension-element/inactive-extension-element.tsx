import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { Extension } from '../../../../../config/ucp/common';
import {
  AvailableExtensionVersionsDictionary,
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../../function/extensions/state/state';
import inactiveExtensionElementClickCallback from '../inactive-extension-element-click-callback';
import { ExtensionElement } from './extension-element';

// eslint-disable-next-line import/prefer-default-export
export function InactiveExtensionsElement(props: { exts: Extension[] }) {
  const { exts } = props;

  if (exts.length === 0) {
    throw Error(`no extensions`);
  }

  const { name } = exts.at(0)!;

  const versions: AvailableExtensionVersionsDictionary = useAtomValue(
    AVAILABLE_EXTENSION_VERSIONS_ATOM,
  );

  const availableVersions = versions[name];

  const preferredVersions = useAtomValue(PREFERRED_EXTENSION_VERSION_ATOM);

  const preferredVersion =
    preferredVersions[name] === undefined
      ? availableVersions[0]
      : preferredVersions[name];

  const ext = exts.filter((e) => e.version === preferredVersion).at(0);

  if (ext === undefined) {
    throw Error(
      'InactiveExtensionElement has no version that is the preferred version',
    );
    return null;
  }

  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const clickCallback = useCallback(
    () => inactiveExtensionElementClickCallback(ext),
    [ext],
  );

  const revDeps = extensionsState.tree.reverseExtensionDependenciesFor(ext);

  return (
    <ExtensionElement
      ext={ext}
      fixedVersion={availableVersions.length <= 1}
      active={false}
      movability={{ up: false, down: false }}
      buttonText="activate"
      clickCallback={clickCallback}
      moveCallback={() => {}}
      revDeps={revDeps
        .map((e) => e.name)
        .filter(
          (n) =>
            extensionsState.activeExtensions.map((e) => e.name).indexOf(n) !==
            -1,
        )}
      displayCustomizeButton={false}
      displayShellOpenButton={false}
      showExclamationMark={false}
    />
  );
}
