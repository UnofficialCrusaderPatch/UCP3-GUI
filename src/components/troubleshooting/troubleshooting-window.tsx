import { atom, useAtomValue } from 'jotai';
import { TROUBLESHOOTING_MD_CONTENT_ATOM } from '../../function/troubleshooting/state';
import Message from '../general/message';
import { SaferMarkdown } from '../markdown/safer-markdown';
import { OverlayContentProps } from '../overlay/overlay';

export const TROUBLESHOOTING_MD_ATOM = atom((get) => {
  const { isSuccess, data } = get(TROUBLESHOOTING_MD_CONTENT_ATOM);

  if (!isSuccess) {
    return (
      <SaferMarkdown>
        Cannot display Troubleshooting document at this time
      </SaferMarkdown>
    );
  }

  return <SaferMarkdown>{data}</SaferMarkdown>;
});

export function Troubleshooting(props: OverlayContentProps) {
  const { closeFunc } = props;
  const md = useAtomValue(TROUBLESHOOTING_MD_ATOM);
  return (
    <div className="credits-container">
      <h1 className="credits-title">
        <Message message="troubleshooting.title" />
      </h1>
      <div
        className="parchment-box credits-text-box"
        style={{
          backgroundColor: '#0d1117',
          backgroundImage: 'none',
        }}
      >
        <div className="credits-text text-light">{md}</div>
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
