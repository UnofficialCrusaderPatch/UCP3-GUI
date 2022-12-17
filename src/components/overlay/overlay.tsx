import { createGlobalState } from 'react-hooks-global-state';
import './overlay.css';

export type OverlayContent = (props: { closeFunc: () => void }) => JSX.Element;

export interface OverlayContentContainer {
  overlayContent: OverlayContent | null;
  setOverlayContent: (overlayContent: OverlayContent | null) => void;
}

const OVERLAY_CONTENT_KEY = 'overlayContent';
const GLOBAL_OVERLAY_CONTENT_STATE = createGlobalState<{
  overlayContent: OverlayContent | null;
}>({ overlayContent: null });

export function useOverlayContent(): OverlayContentContainer {
  const [overlayContent, setOverlayContent] =
    GLOBAL_OVERLAY_CONTENT_STATE.useGlobalState(OVERLAY_CONTENT_KEY);
  return {
    overlayContent,
    setOverlayContent,
  };
}

export function Overlay() {
  const overlayContentContainer = useOverlayContent();

  const closeFunc = () => overlayContentContainer.setOverlayContent(null);

  // no overlay
  if (!overlayContentContainer.overlayContent) {
    return null;
  }

  return (
    <div className="overlay">
      <overlayContentContainer.overlayContent closeFunc={closeFunc} />
    </div>
  );
}
