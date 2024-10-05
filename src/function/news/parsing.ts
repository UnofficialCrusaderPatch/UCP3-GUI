import yaml from 'yaml';
import { News, NewsElement, NewsMeta } from './types';

const docSeparator = /^---\n/gm;

function parseNewsV1(content: string) {
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

const REGEX_META = /^\[meta\]:\s*<>\s*\(([^)]*)\)/gm;

function parseNewsV2(content: string) {
  const splitContent = content
    .split(docSeparator)
    .filter((s) => s.trim().length > 0);

  return splitContent.map((docString) => {
    let meta: NewsMeta;

    const m = new RegExp(REGEX_META).exec(docString);
    if (m === null || m.length < 2) {
      meta = {
        category: 'community',
        timestamp: new Date(),
      };
    } else {
      meta = yaml.parse(m[1]);
      meta.timestamp = new Date(meta.timestamp);
    }

    return {
      meta,
      content: docString,
    } as NewsElement;
  });
}

// eslint-disable-next-line import/prefer-default-export
export function parseNews(content: string): News {
  try {
    return parseNewsV2(content);
  } catch {
    try {
      return parseNewsV1(content);
    } catch (e) {
      return [
        {
          content: `# Failed to load news\n\nreason:${e}`,
          meta: { category: 'error', timestamp: new Date() },
        },
      ];
    }
  }
}
