/* eslint-disable no-param-reassign */

export interface LaunchOptions {
  getArgs: () => string[];
  setArgs: (
    args: string[],
    setInternalArgsState?: (args: string[]) => void,
  ) => void;
  getEnvs: () => Record<string, string>;
  setEnvs: (
    envs: Record<string, string>,
    setInternalEnvsState?: (envs: Record<string, string>) => void,
  ) => void;
}

export function createLaunchOptionFuncs(
  id: string,
  internalArgs: Record<string, string[]>,
  internalEnvs: Record<string, Record<string, string>>,
): LaunchOptions {
  return {
    getArgs: () => internalArgs[id] ?? [],
    setArgs: (
      args: string[],
      setInternalArgsState?: (args: string[]) => void,
    ) => {
      internalArgs[id] = args;
      setInternalArgsState?.(args);
    },
    getEnvs: () => internalEnvs[id] ?? {},
    setEnvs: (
      envs: Record<string, string>,
      setInternalEnvsState?: (envs: Record<string, string>) => void,
    ) => {
      internalEnvs[id] = envs;
      setInternalEnvsState?.(envs);
    },
  };
}
