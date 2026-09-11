import { Fragment } from 'react';
import { useAtomValue } from 'jotai';
import { LANGUAGE_ATOM } from '../../../../function/gui-settings/settings';
import { normalizeSearch } from '../../../../function/content/discovery/search';
import { useMessage } from '../../../general/message';

// eslint-disable-next-line import/prefer-default-export
export function SearchExcerpt(props: {
  text: string;
  query: string;
  approximate: boolean;
}) {
  const { text, query, approximate } = props;
  const language = useAtomValue(LANGUAGE_ATOM);
  const localize = useMessage();
  const terms = [...query.matchAll(/"([^"]+)"|(\S+)/gu)]
    .flatMap((match) =>
      normalizeSearch(match[1] ?? match[2], language).split(' '),
    )
    .filter(Boolean);
  const parts = [...text.matchAll(/\S+|\s+/gu)].map((match) => ({
    text: match[0],
    offset: match.index,
  }));
  return (
    <p className="discovery-excerpt" dir="auto">
      {approximate && <span>{localize('discovery.approximate')}: </span>}
      {parts.map((part) => {
        const match = terms.some((term) =>
          normalizeSearch(part.text, language).includes(term),
        );
        return (
          <Fragment key={part.offset}>
            {match ? <mark>{part.text}</mark> : part.text}
          </Fragment>
        );
      })}
    </p>
  );
}
