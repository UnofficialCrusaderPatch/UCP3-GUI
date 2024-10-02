import yaml from 'yaml';
import { News, NewsMeta } from './types';

const docSeparator = /^---\n/gm;

// eslint-disable-next-line import/prefer-default-export
export function parseNews(content: string) {
  const metas: NewsMeta[] = [];
  const docs: string[] = [];
  const splitContent = content
    .split(docSeparator)
    .filter((s) => s.trim().length > 0);

  splitContent.forEach((docString, index) =>
    index % 2 === 0
      ? metas.push(yaml.parseDocument(docString).toJS() as NewsMeta)
      : docs.push(docString),
  );

  if (metas.length !== docs.length) {
    throw Error(`Failed to parse NEWS (error 1)`);
  }

  const newsElements: News = [];
  metas.forEach((meta, index) => {
    const obj = { meta, content: docs[index].replaceAll('---\n', '') };
    obj.meta.timestamp = new Date(obj.meta.timestamp);
    newsElements.push(obj);
  });

  return newsElements;
}
