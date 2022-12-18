import { createGlobalState } from 'react-hooks-global-state';
import './overlay.css';

export type OverlayContentProps = { closeFunc: () => void };
export type OverlayContent = (props: OverlayContentProps) => JSX.Element;

export interface OverlayContentContainer {
  getOverlayContent: () => OverlayContent | null;
  setOverlayContent: (overlayContent: OverlayContent | null) => void;
}

const OVERLAY_CONTENT_KEY = 'overlayContent';
const GLOBAL_OVERLAY_CONTENT_STATE = createGlobalState<{
  overlayContent: { component: OverlayContent | null } | null;
}>({ overlayContent: null });

export function useOverlayContent(): OverlayContentContainer {
  const [overlayContentContainer, setOverlayContent] =
    GLOBAL_OVERLAY_CONTENT_STATE.useGlobalState(OVERLAY_CONTENT_KEY);
  return {
    getOverlayContent: () =>
      overlayContentContainer ? overlayContentContainer.component : null,
    setOverlayContent: (overlayContent) =>
      setOverlayContent({ component: overlayContent }),
  };
}

export function Overlay() {
  const overlayContentContainer = useOverlayContent();

  const closeFunc = () => overlayContentContainer.setOverlayContent(null);

  // no overlay
  const OverlayContent = overlayContentContainer.getOverlayContent();
  if (!OverlayContent) {
    return null;
  }

  return (
    <div className="overlay">
      <OverlayContent closeFunc={closeFunc} />
    </div>
  );
}
