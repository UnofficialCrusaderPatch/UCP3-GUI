import './credits-button.css';

import { setOverlayContent } from '../../overlay/overlay';
import { Credits } from '../../credits/credits';
import Message from '../../general/message';

export default function CreditsButton() {
  return (
    <button
      type="button"
      className="credits-button"
      onClick={() => setOverlayContent(Credits, true, true)}
    >
      <Message message="credits.open" />
    </button>
  );
}
