import Message from '../../general/message';
import { setOverlayContent } from '../../overlay/overlay';
import { Troubleshooting } from '../../troubleshooting/troubleshooting-window';

// eslint-disable-next-line import/prefer-default-export
export function TroubleShootingButton() {
  return (
    <button
      type="button"
      className="reload-button"
      onClick={async () => {
        setOverlayContent(Troubleshooting, true, true);
      }}
    >
      <Message message="troubleshooting.button" />
    </button>
  );
}
