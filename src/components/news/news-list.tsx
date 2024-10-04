import { useAtomValue } from 'jotai';
import Message from '../general/message';
import { SaferMarkdown } from '../markdown/safer-markdown';
import { OverlayContentProps } from '../overlay/overlay';
import { NEWS_ATOM } from '../../function/news/state';

function ymd(timestamp: Date) {
  return `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDay()}`;
}

// eslint-disable-next-line import/prefer-default-export
export function NewsList(props: OverlayContentProps) {
  const { closeFunc } = props;

  const { data, isError, isFetched, isPending } = useAtomValue(NEWS_ATOM);

  const newsList =
    isFetched && !isError && !isPending
      ? data
          .map(
            (ne) =>
              `date: ${ymd(ne.meta.timestamp)}    category: ${ne.meta.category}\n\n${ne.content}`,
          )
          .join('\n___\n')
      : '';

  return (
    <div className="credits-container">
      <h1 className="credits-title">
        <Message message="news.title" />
      </h1>
      <div
        className="parchment-box credits-text-box"
        style={{ backgroundImage: '' }}
      >
        <div className="credits-text">
          <SaferMarkdown>{`${newsList}`}</SaferMarkdown>
        </div>
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
