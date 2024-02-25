import semver from 'semver';
import { getVersion } from '@tauri-apps/api/app';
import { getStore } from '../../../hooks/jotai/base';
import { UCPVersion, UCP_VERSION_ATOM } from '../../ucp-files/ucp-version';
import { DependencyStatements } from '../../../config/ucp/common';
import Logger from '../../../util/scripts/logging';

const LOGGER = new Logger('system-dependencies.ts');

export const generateSystemDependencies = async () => {
  let ucpDependency = new semver.Range('>=3.0.0');

  const ucpVersionState = getStore().get(UCP_VERSION_ATOM);

  if (ucpVersionState.status === 'ok') {
    const ucpVersion = ucpVersionState.version;

    if (ucpVersion.isValidForSemanticVersioning) {
      ucpDependency = new semver.Range(
        `>=${ucpVersion.getMajorMinorPatchAsString()}`,
      );
    }
  } else {
    LOGGER.msg(
      `Skipping injection of UCP dependency because no valid UCP version was found`,
    ).info();
  }

  const guiDependency = new semver.Range(`>=${await getVersion()}`);

  return {
    framework: ucpDependency,
    frontend: guiDependency,
  };
};

export const appendSystemDependencyStatements = async (
  deps: DependencyStatements,
) => {
  const { framework, frontend } = await generateSystemDependencies();
  return {
    ...deps,
    framework,
    frontend,
  } as DependencyStatements;
};

type FailedCheckSystemDependencyResult = {
  state: 'failed';
  message: string;
};

type SuccesfullCheckSystemDependencyResult = {
  state: 'success';
};

type WarningCheckSystemDependencyResult = {
  state: 'warning';
  message: string;
};

export type CheckSystemDependencyResult = (
  | WarningCheckSystemDependencyResult
  | FailedCheckSystemDependencyResult
  | SuccesfullCheckSystemDependencyResult
) & {
  version: string;
  dependency: semver.Range;
  object: 'frontend' | 'framework';
};

export const checkFrameworkDependency = (deps: DependencyStatements) => {
  if (deps.framework === undefined) {
    return {
      version: new UCPVersion().getMajorMinorPatchAsString(),
      dependency: deps.framework,
      object: 'framework',
      state: 'warning',
      message: 'no specified dependency',
    } as CheckSystemDependencyResult;
  }

  const foundDependency = deps.framework;

  const ucpVersionState = getStore().get(UCP_VERSION_ATOM);

  if (ucpVersionState.status !== 'ok') {
    return {
      version: ucpVersionState.version.getMajorMinorPatchAsString(),
      dependency: foundDependency,
      object: 'framework',
      state: 'warning',
      message: 'framework not installed?',
    } as CheckSystemDependencyResult;
  }

  const ucpVersion = ucpVersionState.version.getMajorMinorPatchAsString();

  return {
    version: ucpVersion,
    dependency: foundDependency,
    object: 'framework',
    state: semver.satisfies(ucpVersion, foundDependency) ? 'success' : 'failed',
  } as CheckSystemDependencyResult;
};

export const checkFrontendDependency = async (deps: DependencyStatements) => {
  if (deps.frontend === undefined) {
    return {
      version: '?',
      dependency: deps.frontend,
      object: 'frontend',
      state: 'warning',
      message: 'no specified dependency',
    } as CheckSystemDependencyResult;
  }

  const foundDependency = deps.frontend;

  const guiVersion = await getVersion();
  return {
    version: guiVersion,
    dependency: foundDependency,
    object: 'frontend',
    state: semver.satisfies(guiVersion, foundDependency) ? 'success' : 'failed',
  } as CheckSystemDependencyResult;
};

export const checkSystemDependencies = async (deps: DependencyStatements) =>
  checkFrameworkDependency(deps) && (await checkFrontendDependency(deps));

export const removeSystemDependencies = (deps: DependencyStatements) => {
  const { frontend, framework, ...rest } = deps;

  return rest as DependencyStatements;
};
