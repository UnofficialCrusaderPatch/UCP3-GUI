/* eslint-disable react/require-default-props */
import { useAtomValue } from 'jotai';
import { ReactNode, useCallback } from 'react';
import { Extension } from '../../../../../config/ucp/common';
import {
  AvailableExtensionVersionsDictionary,
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../../function/extensions/state/state';
import inactiveExtensionElementClickCallback from '../inactive-extension-element-click-callback';
import { ExtensionElement } from './extension-element';
import { FamilyRow } from '../../../common/discovery/family-list';

// eslint-disable-next-line import/prefer-default-export
export function InactiveExtensionsElement(props: {
  exts: Extension[];
  familyToggle?: ReactNode;
  familyRow?: FamilyRow;
  selectedExtension?: Extension;
}) {
  const { exts, familyToggle, familyRow, selectedExtension } = props;

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

  const ext =
    selectedExtension ??
    exts.filter((e) => e.version === preferredVersion).at(0);

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
  const familyButtonText = familyRow?.selected
    ? 'discovery.family.selected'
    : 'discovery.family.switch';

  return (
    <ExtensionElement
      familyToggle={familyToggle}
      displayName={familyRow?.displayName}
      actionDisabled={familyRow?.selected}
      ext={ext}
      fixedVersion={!!selectedExtension || availableVersions.length <= 1}
      active={false}
      movability={{ up: false, down: false }}
      buttonText={familyRow ? familyButtonText : 'activate'}
      clickCallback={clickCallback}
      moveCallback={() => {}}
      revDeps={
        familyRow
          ? []
          : revDeps
              .map((e) => e.name)
              .filter(
                (n) =>
                  extensionsState.activeExtensions
                    .map((e) => e.name)
                    .indexOf(n) !== -1,
              )
      }
      displayCustomizeButton={false}
      displayShellOpenButton
      showExclamationMark={false}
    />
  );
}
