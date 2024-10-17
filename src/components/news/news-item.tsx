import { NewsElement } from '../../function/news/types';
import { SaferMarkdown } from '../markdown/safer-markdown';
import { ymd } from './util';

// eslint-disable-next-line import/prefer-default-export
export function NewsItem(props: { item: NewsElement }) {
  const { item } = props;
  const { meta, content } = item;
  return (
    <div className="border-bottom border-dark pb-1">
      <SaferMarkdown>{content}</SaferMarkdown>
      <div className="d-flex justify-content-end">
        <span className="fs-7">{`${ymd(meta.timestamp)}`}</span>
      </div>
    </div>
  );
}
