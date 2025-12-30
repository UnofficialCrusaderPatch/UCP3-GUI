function touchedCustomMenu(
  configurationTouched: { [key: string]: boolean },
  url: string,
) {
  const [, v] = Object.entries(configurationTouched).reduce(
    ([prevString, prevValue], [curString, curValue]) => {
      if (prevValue) return [prevString, prevValue];
      if (curString.startsWith(url)) {
        if (curValue) return [curString, curValue];
        return [prevString, prevValue];
      }
      return [prevString, prevValue];
    },
    ['none', false],
  );
  return v;
}

// eslint-disable-next-line import/prefer-default-export
export { touchedCustomMenu };
