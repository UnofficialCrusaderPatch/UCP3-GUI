import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { Extension } from '../../../../../config/ucp/common';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../../function/extensions/state/state';
import { CREATOR_MODE_ATOM } from '../../../../../function/gui-settings/settings';
import { compareObjects } from '../../../../../util/scripts/objectCompare';
import activeExtensionElementClickCallback from '../active-extension-element-click-callback';
import moveExtensionClickCallback from '../move-extension-click-callback';
import { ExtensionElement } from './extension-element';

// eslint-disable-next-line import/prefer-default-export
export function ActiveExtensionElement(props: {
  ext: Extension;
  index: number;
  arr: Extension[];
}) {
  const { ext, index, arr } = props;

  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const revDeps = extensionsState.tree
    .reverseExtensionDependenciesFor(ext)
    .map((e) => e.name);
  const depsFor = extensionsState.tree
    .directExtensionDependenciesFor(ext)
    .map((e) => e.name);

  const movability = {
    up: index > 0 && revDeps.indexOf(arr[index - 1].name) === -1,
    down: index < arr.length - 1 && depsFor.indexOf(arr[index + 1].name) === -1,
  };

  const clickCallback = useCallback(
    () => activeExtensionElementClickCallback(ext),
    [ext],
  );

  const moveCallback = useCallback(
    (event: { name: string; type: 'up' | 'down' }) =>
      moveExtensionClickCallback(event),
    [],
  );

  const theRevDeps = extensionsState.tree
    .reverseExtensionDependenciesFor(ext)
    .map((e) => e.name)
    .filter(
      (n) =>
        extensionsState.activeExtensions.map((e) => e.name).indexOf(n) !== -1,
    );

  const guiCreatorMode = useAtomValue(CREATOR_MODE_ATOM);

  const overrides = extensionsState.configuration.overrides.get(ext.name);
  const showExclamationMark =
    overrides !== undefined &&
    overrides
      .filter(
        (override) =>
          !override.overridden.url.endsWith('.menu') &&
          !override.overridden.url.endsWith('.defaultLanguage'),
      )
      .filter(
        (override) =>
          !compareObjects(override.overridden.value, override.overriding.value),
      ).length > 0;

  return (
    <ExtensionElement
      ext={ext}
      fixedVersion
      active
      movability={movability}
      buttonText="deactivate"
      clickCallback={clickCallback}
      moveCallback={moveCallback}
      displayShellOpenButton={guiCreatorMode && ext.type === 'plugin'}
      displayCustomizeButton={guiCreatorMode && ext.type === 'plugin'}
      revDeps={theRevDeps}
      showExclamationMark={showExclamationMark}
    />
  );
}
