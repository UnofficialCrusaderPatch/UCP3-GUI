import './overlay.css';

import { atom, useAtom, useSetAtom } from 'jotai';

type OverlayConfig<T> = [OverlayContent<T>, T] | null;
export type OverlayContentProps<T = undefined> = {
  closeFunc: () => void;
  args: T;
};
export type OverlayContent<T = undefined> = (
  props: OverlayContentProps<T>,
) => JSX.Element;

const OVERLAY_CONTENT_ATOM = atom<unknown>(null);

export function useSetOverlayContent<T = undefined>(): (
  overlayContent: OverlayContent<T>,
  args?: T,
) => void {
  const setOverlayContent = useSetAtom(OVERLAY_CONTENT_ATOM);

  // the atoms setters expect supplier if functions, so this needs a new function
  return (newOverlayContent, args?) =>
    setOverlayContent(() => [newOverlayContent, args]);
}

export function Overlay<T>() {
  const [unknownOverlayConfig, setOverlayContent] =
    useAtom(OVERLAY_CONTENT_ATOM);
  const overlayConfig = unknownOverlayConfig as OverlayConfig<T>;

  const closeFunc = () => setOverlayContent(null);

  // no overlay
  if (!overlayConfig) {
    return null;
  }
  const [OverlayContent, args] = overlayConfig;
  return (
    <div className="overlay">
      <OverlayContent closeFunc={closeFunc} args={args} />
    </div>
  );
}
