import { atom, useAtomValue } from 'jotai';
import { XCircleFill } from 'react-bootstrap-icons';
import { useState } from 'react';
import {
  NEWS_HIGHLIGHT_ATOM,
  newsID,
  SCROLL_TO_NEWS_ATOM,
} from '../../../function/news/state';
import { NewsElement } from '../../../function/news/types';
import { HIDDEN_NEWS_HIGHLIGHTS_ATOM } from '../../../function/gui-settings/settings';
import { getStore } from '../../../hooks/jotai/base';
import { NewsList } from '../../news/news-list';
import { setOverlayContent } from '../../overlay/overlay';
import Message from '../../general/message';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function camelCase(s: string) {
  return s.substring(0, 1).toLocaleUpperCase() + s.substring(1);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function dmy(d: Date) {
  return d.toLocaleString().split(',')[0];
}

function Headline(props: { news: NewsElement }) {
  const { news } = props;
  const firstLine = news.content
    .split('\n')
    .filter((s) => s.length > 0 && s.trim().length > 0)[0];
  const sanitized = firstLine.startsWith('#')
    ? firstLine.trim().split('#', 2)[1].trim()
    : firstLine;
  // const category = `${camelCase(news.meta.category)} update`;

  const [isHovered, setHovered] = useState(false);

  const id = newsID(news);

  return (
    <div
      className="text-start row fs-6 pb-2 px-0"
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      {/* <span className="col-4">{`${category}`}</span> */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <span
        className="col mt-0 px-0"
        style={{
          textDecoration: isHovered ? 'underline' : '',
          borderBottom: isHovered ? '1px' : '',
          cursor: isHovered ? 'pointer' : 'default',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onClick={() => {
          getStore().set(SCROLL_TO_NEWS_ATOM, id);
          setOverlayContent(NewsList, true, true);
        }}
      >{`${sanitized}`}</span>
      {/* <span className="col-2">{`${dmy(news.meta.timestamp)}`}</span> */}
      <span
        className="col-1 px-0 mt-0"
        style={{
          visibility: isHovered ? 'visible' : 'hidden',
          opacity: isHovered ? 1 : 0,
          transition: 'visibility 0s, opacity 0.25s linear',
          cursor: isHovered ? 'pointer' : 'default',
        }}
      >
        <XCircleFill
          onClick={() => {
            const hidden = getStore().get(HIDDEN_NEWS_HIGHLIGHTS_ATOM);
            hidden.push(news.meta.timestamp.toISOString());
            getStore().set(HIDDEN_NEWS_HIGHLIGHTS_ATOM, [...hidden]);
          }}
        />
      </span>
    </div>
  );
}

const highlightsToDisplay = atom((get) => {
  const highlights = get(NEWS_HIGHLIGHT_ATOM);

  const hiddenHighlights = get(HIDDEN_NEWS_HIGHLIGHTS_ATOM);

  return highlights.filter(
    (h) => hiddenHighlights.indexOf(h.meta.timestamp.toISOString()) === -1,
  );
});

function Headlines() {
  const highlights = useAtomValue(highlightsToDisplay);

  if (highlights.length === 0) {
    return (
      <div className="h-100 px-3 pb-3" style={{ overflowY: 'scroll' }}>
        <Message message="news.none" />
      </div>
    );
  }

  return (
    <div className="h-100 px-3 pb-3" style={{ overflowY: 'scroll' }}>
      {highlights.map((h) => (
        <Headline
          key={`news-highlight-${h.meta.timestamp}`}
          news={h as NewsElement}
        />
      ))}
    </div>
  );
}

// eslint-disable-next-line import/prefer-default-export, @typescript-eslint/no-unused-vars
export function NewsHighlights(props: object) {
  return (
    <div
      className="text-center p-2 mt-3 pb-5"
      style={{
        minHeight: '0px',
        width: '60%',
        // backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backgroundImage:
          'linear-gradient(to top, rgba(0,0,0,0), rgba(25,25,25,0.75))',
      }}
    >
      <h3 className="border-bottom pb-2" style={{ marginBottom: '1.25rem' }}>
        <Message message="news.title" />
      </h3>
      <Headlines />
    </div>
  );
}
