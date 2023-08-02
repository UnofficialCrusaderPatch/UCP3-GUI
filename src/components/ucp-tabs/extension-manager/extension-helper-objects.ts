import { Extension } from 'config/ucp/common';
import ExtensionDependencySolver from 'config/ucp/extension-dependency-solver';
import { ExtensionsState } from 'function/global/types';

function createHelperObjects(extensions: Extension[]) {
  const eds = new ExtensionDependencySolver(extensions);
  const revDeps = Object.fromEntries(
    extensions.map((e: Extension) => [
      e.name,
      eds.reverseDependenciesFor(e.name),
    ])
  );
  const depsFor = Object.fromEntries(
    extensions.map((e: Extension) => [
      e.name,
      eds
        .dependenciesFor(e.name)
        .flat()
        .filter((s) => s !== e.name),
    ])
  );
  const extensionsByName = Object.fromEntries(
    extensions.map((ext: Extension) => [ext.name, ext])
  );
  const extensionsByNameVersionString = Object.fromEntries(
    extensions.map((ext: Extension) => [`${ext.name}-${ext.version}`, ext])
  );

  return {
    eds,
    revDeps,
    depsFor,
    extensionsByName,
    extensionsByNameVersionString,
  };
}

// eslint-disable-next-line import/prefer-default-export
export { createHelperObjects };
