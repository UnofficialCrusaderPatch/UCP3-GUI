/* eslint-disable import/prefer-default-export */
const localeSensitiveFields = [
  'description',
  'text',
  'subtext',
  'tooltip',
  'header',
  'choices',
  'category',
];
const localeRegExp = /^\s*{{(.*)}}\s*$/;
const ignoreFields = ['extension'];

function changeLocaleOfObj(
  locale: { [key: string]: string },
  obj: { [key: string]: unknown },
) {
  const newObj = { ...obj };
  Object.entries(obj)
    .filter(([k]) => ignoreFields.indexOf(k) !== -1)
    .forEach(([k, v]) => {
      if (typeof v === 'string') {
        const search = localeRegExp.exec(v);

        if (search !== undefined && search !== null) {
          const keyword = search[1];
          const loc = locale[keyword.toLowerCase()];
          if (loc !== undefined) {
            // eslint-disable-next-line no-param-reassign
            newObj[k] = loc;
          }
        }
      } else if (typeof v === 'object') {
        newObj[k] = changeLocaleOfObj(
          locale,
          obj[k] as unknown as { [key: string]: string },
        );
      }
    });

  return newObj;
}

function changeLocaleForObj(
  locale: { [key: string]: string },
  obj: { [key: string]: unknown },
) {
  const newObj = { ...obj };

  localeSensitiveFields.forEach((field) => {
    if (typeof obj[field] === 'string') {
      const search = localeRegExp.exec(obj[field] as string);

      if (search !== undefined && search !== null) {
        const keyword = search[1];
        const loc = locale[keyword.toLowerCase()];
        if (loc !== undefined) {
          // eslint-disable-next-line no-param-reassign
          newObj[field] = loc;
        }
      }
    }
    if (obj[field] instanceof Array) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      newObj[field] = changeLocaleForArray(locale, obj[field] as unknown[]);
    } else if (obj[field] instanceof Object) {
      newObj[field] = changeLocaleOfObj(
        locale,
        obj[field] as { [key: string]: unknown },
      );
    }
  });

  Object.entries(obj)
    .filter(([key]) => ignoreFields.indexOf(key) === -1)
    .forEach(([key, value]) => {
      if (value !== null && value instanceof Array) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        newObj[key] = changeLocaleForArray(locale, value as unknown[]);
      } else if (value !== null && value instanceof Object) {
        newObj[key] = changeLocaleForObj(
          locale,
          value as { [key: string]: unknown },
        );
      }
    });

  return newObj;
}

function changeLocaleForArray(
  locale: { [key: string]: string },
  obj: unknown[],
) {
  const newObj = [...obj];

  obj.forEach((value, index) => {
    if (typeof value === 'string') {
      const search = localeRegExp.exec(value as string);

      if (search !== undefined && search !== null) {
        const keyword = search[1];
        const loc = locale[keyword.toLowerCase()];
        if (loc !== undefined) {
          // eslint-disable-next-line no-param-reassign
          newObj[index] = loc;
        }
      }
    } else if (value !== null && value instanceof Array) {
      newObj[index] = changeLocaleForArray(locale, value as unknown[]);
    } else if (value !== null && value instanceof Object) {
      newObj[index] = changeLocaleForObj(
        locale,
        value as { [key: string]: unknown },
      );
    }
  });

  return newObj;
}

function changeLocale(locale: { [key: string]: string }, obj: unknown) {
  if (obj !== null && obj instanceof Array) {
    return changeLocaleForArray(locale, obj as unknown[]);
  }
  if (obj !== null && obj instanceof Object) {
    return changeLocaleForObj(locale, obj as { [key: string]: unknown });
  }
  throw Error('changeLocale failed');
}

export { changeLocale };
