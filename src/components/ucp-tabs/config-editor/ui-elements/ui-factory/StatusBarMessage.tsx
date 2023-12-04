import { ConfigurationSuggestion } from 'function/configuration/state';
import { ConfigurationLock } from 'function/configuration/state';

const createStatusBarMessage = (
  disabledByParent: boolean,
  disabledByValue: boolean,
  disabledByRequired: boolean,
  valueStatement?: string,
  lockInformation?: ConfigurationLock,
  hasSuggestion?: boolean,
  suggestionInformation?: ConfigurationSuggestion,
) => {
  let statusBarMessage: string | undefined;
  if (disabledByParent) {
    statusBarMessage = `Can't change value because of a parent element`;
  } else if (disabledByValue) {
    statusBarMessage = `Can't change value because it is disabled. Reason: '${valueStatement}' evaluates to 'false'`;
  } else if (disabledByRequired && lockInformation !== undefined) {
    statusBarMessage = `Can't change value because extension '${lockInformation.lockedBy}' requires value ${lockInformation.lockedValue}`;
  } else if (hasSuggestion && suggestionInformation !== undefined) {
    statusBarMessage = `'${suggestionInformation.suggestedBy}' suggests value '${suggestionInformation.suggestedValue}'`;
  }
  return statusBarMessage;
};

// eslint-disable-next-line import/prefer-default-export
export { createStatusBarMessage };
