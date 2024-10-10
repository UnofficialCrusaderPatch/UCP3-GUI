import Message from '../../general/message';
import { NewsList } from '../../news/news-list';
import { setOverlayContent } from '../../overlay/overlay';

// eslint-disable-next-line import/prefer-default-export
export function NewsButton() {
  return (
    <button
      type="button"
      className="restart-button"
      onClick={async () => {
        setOverlayContent(NewsList, true, true);
      }}
    >
      <Message message="news.button" />
    </button>
  );
}
