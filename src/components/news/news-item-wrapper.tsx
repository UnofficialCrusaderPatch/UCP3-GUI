import { forwardRef, Ref } from 'react';
import { newsID } from '../../function/news/state';
import { NewsElement } from '../../function/news/types';
import { NewsItem } from './news-item';

/**
 * Wrapper for a NewsItem. The Wrapper has an id which is used
 * for element.scrollIntoView() behavior.
 * Scroll into view occurs when the main NewsList component has
 * finished rendering using a useEffect()
 */
// eslint-disable-next-line prefer-arrow-callback, import/prefer-default-export
export const NewsItemWrapper = forwardRef(function NewsItemWrapper(
  props: { item: NewsElement },
  ref: Ref<HTMLDivElement>,
) {
  const { item } = props;
  return (
    <div
      id={`${newsID(item)}-wrapper`}
      ref={ref}
      key={newsID(item)}
      className="pt-2 pb-2"
    >
      <NewsItem item={item} />
    </div>
  );
});
