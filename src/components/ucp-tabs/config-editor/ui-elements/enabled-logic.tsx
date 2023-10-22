const parseEnabledLogic = (
  statement: string,
  configuration: { [key: string]: unknown },
  configurationDefaults: { [key: string]: unknown },
) => {
  if (statement === undefined || statement === null) return true;

  const reLiteral = /^(true|false)$/;
  const reSimple = /^\s*([!]{0,1})([a-zA-Z0-9_.]+)\s*$/;
  const reBooleanComparison =
    /^\s*([a-zA-Z0-9_.]+)\s*((?:==)|(?:!=))\s*((?:true)|(?:false))\s*$/;
  const reNumericComparison =
    /^\s*([a-zA-Z0-9_.]+)\s*((?:==)|(?:!=))\s*([0-9.]+)\s*$/;
  const reStringComparison =
    /^\s*([a-zA-Z0-9_.]+)\s*((?:==)|(?:!=))\s*"([^"]+)"\s*$/;

  const sLiteral = reLiteral.exec(statement);
  if (sLiteral !== null) {
    const [, lit] = sLiteral;
    if (lit === 'true') return true;
    if (lit === 'false') return false;
    throw new Error('we should never get here');
  }
  const sSimple = reSimple.exec(statement);
  if (sSimple !== null) {
    const [, exclamationMark, url] = sSimple;
    const configValue =
      configuration[url] !== undefined
        ? configuration[url]
        : configurationDefaults[url];
    if (configValue === undefined) return undefined;
    if (exclamationMark === '!') {
      return configValue !== true;
    }
    return configValue !== false;
  }
  const sBoolComp = reBooleanComparison.exec(statement);
  if (sBoolComp !== null) {
    const [, url, comparator, value] = sBoolComp;
    const configValue =
      configuration[url] !== undefined
        ? configuration[url]
        : configurationDefaults[url];
    if (configValue === undefined) return undefined;
    if (comparator === '==') {
      if (value === 'true') {
        return configValue === true;
      }
      if (value === 'false') {
        return configValue === false;
      }
      return undefined;
    }
    if (comparator === '!=') {
      if (value === 'true') {
        return configValue !== true;
      }
      if (value === 'false') {
        return configValue !== false;
      }
      return undefined;
    }
    return undefined;
  }
  const sNumComp = reNumericComparison.exec(statement);
  if (sNumComp !== null) {
    const [, url, comparator, value] = sNumComp;
    const configValue =
      configuration[url] !== undefined
        ? configuration[url]
        : configurationDefaults[url];
    if (configValue === undefined) return undefined;
    if (comparator === '==') {
      return configValue === parseFloat(value);
    }
    if (comparator === '!=') {
      return configValue !== parseFloat(value);
    }
    return undefined;
  }
  const sStringComp = reStringComparison.exec(statement);
  if (sStringComp !== null) {
    const [, url, comparator, value] = sStringComp;
    const configValue =
      configuration[url] !== undefined
        ? configuration[url]
        : configurationDefaults[url];
    if (configValue === undefined) return undefined;
    if (comparator === '==') {
      return configValue === value;
    }
    if (comparator === '!=') {
      return configValue !== value;
    }
    return undefined;
  }
  return undefined;
};

// eslint-disable-next-line import/prefer-default-export
export { parseEnabledLogic };
