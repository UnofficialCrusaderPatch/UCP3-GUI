import './credits.css';

import { SaferMarkdown } from '../markdown/safer-markdown';
import { OverlayContentProps } from '../overlay/overlay';

// eslint-disable-next-line import/no-unresolved
import credits from './credits.md?raw';
import Message from '../general/message';

// eslint-disable-next-line import/prefer-default-export
export function Credits(props: OverlayContentProps) {
  const { closeFunc } = props;

  return (
    <div className="credits-container">
      <h1 className="credits-title">
        <Message message="credits.title" />
      </h1>
      <div
        className="parchment-box credits-text-box"
        style={{ backgroundImage: '' }}
      >
        <div className="credits-text">
          <SaferMarkdown>{credits}</SaferMarkdown>
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
