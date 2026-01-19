import { CREATOR_MODE_ATOM } from 'function/gui-settings/settings';
import { getStore } from 'hooks/jotai/base';

function createSpecifiedStyle(specified: boolean, version?: number) {
  if (getStore().get(CREATOR_MODE_ATOM) === false) return ``;
  if (!specified) return ``;
  if (version === 1) {
    return `border-4 border-start border-primary`;
  }
  return `ucp-touched`;
}

function createSpecifiedStyleIfSpecified(
  configuration: { [key: string]: any },
  url: string,
  version?: number,
) {
  return createSpecifiedStyle(
    Object.keys(configuration).indexOf(url) !== -1,
    version,
  );
}

function createSpecifiedStyleIfSpecifiedAndTouched(
  configuration: { [key: string]: any },
  touched: { [key: string]: boolean },
  url: string,
) {
  const specified = Object.keys(configuration).indexOf(url) !== -1;
  const touch = touched[url] === true;

  const classNames: string[] = [];
  if (specified) {
    classNames.push('ucp-specified');
  }
  if (touch) {
    classNames.push('ucp-touched');
  }

  return classNames.join(' ');
}

// eslint-disable-next-line import/prefer-default-export
export {
  createSpecifiedStyle,
  createSpecifiedStyleIfSpecified,
  createSpecifiedStyleIfSpecifiedAndTouched,
};
