/* eslint import/prefer-default-export: off, import/no-mutable-exports: off */
import path from 'path';

export let resolveHtmlPath: (htmlFileName: string) => string;

if (process.env.NODE_ENV === 'development') {
  // const port = process.env.PORT || 1212;   // no port env varaible?
  const port = 1212;
  resolveHtmlPath = (htmlFileName: string) => {
    const url = `http://localhost:${port}/${htmlFileName}`;
    // url.pathname = htmlFileName;
    // return url.href;
    return url;
  };
} else {
  resolveHtmlPath = (htmlFileName: string) => {
    return `file://${path.resolve(__dirname, '../renderer/')}/${htmlFileName}`;
  };
}
