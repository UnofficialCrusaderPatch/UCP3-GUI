import { atom, useAtom } from 'jotai';
import './overlay.css';

export type OverlayContentProps = { closeFunc: () => void };
export type OverlayContent = (props: OverlayContentProps) => JSX.Element;

export interface OverlayContentContainer {
  getOverlayContent: () => OverlayContent | null;
  setOverlayContent: (overlayContent: OverlayContent | null) => void;
}

const OVERLAY_CONTENT_ATOM = atom<OverlayContent | null>(null);
export function useOverlayContent(): OverlayContentContainer {
  const [overlayContent, setOverlayContent] = useAtom(OVERLAY_CONTENT_ATOM);
  return {
    getOverlayContent: () => overlayContent,
    // the atoms setter are expect supplier if functions, so this needs a new function
    setOverlayContent: (newOverlayContent) =>
      setOverlayContent(() => newOverlayContent),
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
