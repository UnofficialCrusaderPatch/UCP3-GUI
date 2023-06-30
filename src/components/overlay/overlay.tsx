import { atom, useAtom, useSetAtom } from 'jotai';
import './overlay.css';

export type OverlayContentProps = { closeFunc: () => void };
export type OverlayContent = (props: OverlayContentProps) => JSX.Element;

const OVERLAY_CONTENT_ATOM = atom<OverlayContent | null>(null);

export function useSetOverlayContent(): (
  overlayContent: OverlayContent | null
) => void {
  const setOverlayContent = useSetAtom(OVERLAY_CONTENT_ATOM);

  // the atoms setters expect supplier if functions, so this needs a new function
  return (newOverlayContent) => setOverlayContent(() => newOverlayContent);
}

export function Overlay() {
  const [OverlayContent, setOverlayContent] = useAtom(OVERLAY_CONTENT_ATOM);

  const closeFunc = () => setOverlayContent(null);

  // no overlay
  if (!OverlayContent) {
    return null;
  }

  return (
    <div className="overlay">
      <OverlayContent closeFunc={closeFunc} />
    </div>
  );
}
