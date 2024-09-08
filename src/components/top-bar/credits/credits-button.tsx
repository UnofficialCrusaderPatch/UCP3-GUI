import './credits-button.css';

import { setOverlayContent } from '../../overlay/overlay';
import { Credits } from '../../credits/credits';
import Text from '../../general/text';

export default function CreditsButton() {
  return (
    <button
      type="button"
      className="credits-button"
      onClick={() => setOverlayContent(Credits, true, true)}
    >
      <Text message="credits.open" />
    </button>
  );
}
