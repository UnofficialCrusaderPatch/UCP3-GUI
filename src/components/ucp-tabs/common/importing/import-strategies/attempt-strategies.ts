import { ConfigFile } from '../../../../../config/ucp/common';
import { createEmptyConfigurationState } from '../../../../../function/configuration/state';
import { ExtensionsState } from '../../../../../function/extensions/extensions-state';
import { MessageType } from '../../../../../localization/localization';
import Logger from '../../../../../util/scripts/logging';
import { StrategyResultReport } from '../result';
import { fullStrategy } from './full-strategy';
import { sparseStrategy } from './sparse-strategy';

const LOGGER = new Logger('attempt-strategies.ts');

// eslint-disable-next-line import/prefer-default-export
export function attemptStrategies(
  config: ConfigFile,
  extensionsState: ExtensionsState,
  setConfigStatus: (message: MessageType) => void,
  repair?: boolean,
): StrategyResultReport {
  const report: StrategyResultReport = {
    reports: [],
  };
  // Create a new extension state by setting the active Extensions and explicitly active extensions to empty arrays
  // Also wipe the current configuration and rebuild it from scratch
  const newExtensionsState = {
    ...extensionsState,
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
    configuration: createEmptyConfigurationState(),
  } as ExtensionsState;

  // TODO: don't allow fancy semver in a user configuration. Only allow it in definition.yml. Use tree logic.
  // Get the load order from the sparse part of the config file

  LOGGER.msg('Attempting full strategy').debug();
  const fullStrategyResult = fullStrategy(
    newExtensionsState,
    config,
    setConfigStatus,
  );

  report.reports.push({
    name: 'fullStrategy',
    result: fullStrategyResult,
  });

  let strategyResult = fullStrategyResult;

  if (fullStrategyResult.status === 'error') {
    if (fullStrategyResult.code === 'GENERIC') {
      LOGGER.msg(
        `${fullStrategyResult.code}: ${fullStrategyResult.messages.join('\n')}`,
      ).error();

      return report;
    }

    if (fullStrategyResult.code === 'MISSING_LOAD_ORDER') {
      LOGGER.msg(`Missing load order specification`).warn();
    } else {
      LOGGER.msg(
        `${fullStrategyResult.code}: ${fullStrategyResult.dependencies.join('\n')}`,
      ).warn();
    }

    // Continue with sparse mode
    LOGGER.msg('Attempting sparse strategy').debug();
    const sparseStrategyResult = sparseStrategy(
      newExtensionsState,
      config,
      setConfigStatus,
      repair,
    );

    report.reports.push({
      name: 'sparseStrategy',
      result: sparseStrategyResult,
    });

    if (sparseStrategyResult.status === 'error') {
      if (sparseStrategyResult.code === 'GENERIC') {
        LOGGER.msg(
          `${fullStrategyResult.code}: ${sparseStrategyResult.messages.join('\n')}`,
        ).error();
      } else if (sparseStrategyResult.code === 'MISSING_LOAD_ORDER') {
        LOGGER.msg(`Missing load order specification`).warn();
      } else {
        LOGGER.msg(
          `${fullStrategyResult.code}: ${sparseStrategyResult.dependencies.join('\n')}`,
        ).error();
      }

      return report;
    }
    strategyResult = sparseStrategyResult;
  }

  if (strategyResult.status !== 'ok') {
    LOGGER.msg(
      `occurred when importing config. Error code import-button-callback-1.`,
    ).error();
  }

  report.result = strategyResult;

  return report;
}
