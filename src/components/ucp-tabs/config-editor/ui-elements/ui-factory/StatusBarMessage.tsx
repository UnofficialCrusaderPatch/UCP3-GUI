import {
  ConfigurationSuggestion,
  ConfigurationLock,
} from '../../../../../function/configuration/state';
import { SimpleMessageType } from '../../../../../localization/localization';

const createStatusBarMessage = (
  disabledByParent: boolean,
  disabledByValue: boolean,
  disabledByRequired: boolean,
  valueStatement?: string,
  lockInformation?: ConfigurationLock,
  hasSuggestion?: boolean,
  suggestionInformation?: ConfigurationSuggestion,
): SimpleMessageType | undefined => {
  if (disabledByParent) {
    return {
      key: 'config.option.change.parent',
    };
  }
  if (disabledByValue) {
    return {
      key: 'config.option.disabled',
      args: {
        valueStatement,
      },
    } as SimpleMessageType;
  }
  if (disabledByRequired && lockInformation !== undefined) {
    return {
      key: 'config.option.change.required',
      args: {
        lockedBy: lockInformation.lockedBy,
        lockedValue: JSON.stringify(lockInformation.lockedValue),
      },
    };
  }
  if (hasSuggestion && suggestionInformation !== undefined) {
    return {
      key: 'config.option.suggestion',
      args: {
        suggestedBy: suggestionInformation.suggestedBy,
        suggestedValue: suggestionInformation.suggestedValue,
      },
    };
  }
  return undefined;
};

// eslint-disable-next-line import/prefer-default-export
export { createStatusBarMessage };
