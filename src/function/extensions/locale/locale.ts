/* eslint-disable import/prefer-default-export */
const localeSensitiveFields = [
  'description',
  'text',
  'subtext',
  'tooltip',
  'header',
  'choices',
];
const localeRegExp = /^\s*{{(.*)}}\s*$/;

function changeLocaleOfObj(
  locale: { [key: string]: string },
  obj: { [key: string]: string },
) {
  Object.entries(obj).forEach(([k, v]) => {
    if (typeof v === 'string') {
      const search = localeRegExp.exec(v);

      if (search !== undefined && search !== null) {
        const keyword = search[1];
        const loc = locale[keyword.toLowerCase()];
        if (loc !== undefined) {
          // eslint-disable-next-line no-param-reassign
          obj[k] = loc;
        }
      }
    } else if (typeof v === 'object') {
      changeLocaleOfObj(locale, obj[k] as unknown as { [key: string]: string });
    }
  });
}

function changeLocale(
  locale: { [key: string]: string },
  obj: { [key: string]: unknown },
): void {
  localeSensitiveFields.forEach((field) => {
    if (typeof obj[field] === 'string') {
      const search = localeRegExp.exec(obj[field] as string);

      if (search !== undefined && search !== null) {
        const keyword = search[1];
        const loc = locale[keyword.toLowerCase()];
        if (loc !== undefined) {
          // eslint-disable-next-line no-param-reassign
          obj[field] = loc;
        }
      }
    }
    if (typeof obj[field] === 'object' && obj[field] !== null) {
      changeLocaleOfObj(locale, obj[field] as { [key: string]: string });
    }
  });

  Object.entries(obj).forEach(([key, value]) => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      changeLocale(locale, value as { [key: string]: unknown });
    }
  });
}

export { changeLocale };
