import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import Message from '../general/message';
import { OverlayContentProps } from '../overlay/overlay';
import {
  NEWS_ATOM,
  newsID,
  SCROLL_TO_NEWS_ATOM,
} from '../../function/news/state';
import { getStore } from '../../hooks/jotai/base';
import { NewsItemWrapper } from './news-item-wrapper';

/**
 * News list visual element displaying all news available.
 *
 * @param props properties for this overlay content
 * @returns NewsList
 */
// eslint-disable-next-line import/prefer-default-export
export function NewsList(props: OverlayContentProps) {
  const { closeFunc } = props;

  const scrollToNewsID = useAtomValue(SCROLL_TO_NEWS_ATOM);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data, isError, isFetched, isPending } = useAtomValue(NEWS_ATOM);

  const newsList =
    isFetched && !isError && !isPending
      ? data
          // @ts-expect-error Typescript complains about subtracting Date
          .sort((a, b) => b.meta.timestamp - a.meta.timestamp)
          .map((ne) => (
            <NewsItemWrapper
              ref={
                scrollToNewsID.length > 0 && scrollToNewsID === newsID(ne)
                  ? wrapperRef
                  : undefined
              }
              key={`${newsID(ne)}-wrapper`}
              item={ne}
            />
          ))
      : null;

  useEffect(() => {
    if (wrapperRef.current !== null) {
      wrapperRef.current.scrollIntoView();
      getStore().set(SCROLL_TO_NEWS_ATOM, '');
    }
  }, []);

  return (
    <div className="credits-container">
      <h1 className="credits-title">
        <Message message="news.title" />
      </h1>
      <div
        className="parchment-box credits-text-box"
        style={{ backgroundImage: '' }}
      >
        <div className="credits-text">{newsList}</div>
      </div>
      <button
        type="button"
        className="ucp-button credits-close"
        onClick={closeFunc}
      >
        <Message message="close" />
      </button>
    </div>
  );
}
