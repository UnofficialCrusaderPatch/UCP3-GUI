/* eslint-disable @typescript-eslint/no-explicit-any */
import './overlay.css';

import { useEffect } from 'react';
import { atom, useAtom, useSetAtom } from 'jotai';

type OverlayConfig<T> = [OverlayContent<T>, T] | null;
export type OverlayContentProps<T = undefined> = {
  closeFunc: () => void;
  args: T;
};
export type OverlayContent<T = undefined> = (
  props: OverlayContentProps<T>,
) => JSX.Element;

const OVERLAY_CONTENT_ATOM = atom<OverlayConfig<any>>(null);

export const OVERLAY_ACTIVE_ATOM = atom(false);

export function useSetOverlayContent<T = undefined>(): (
  overlayContent: OverlayContent<T>,
  args?: T,
) => void {
  const setOverlayContent = useSetAtom(OVERLAY_CONTENT_ATOM);

  // the atoms setters expect supplier if functions, so this needs a new function
  return (newOverlayContent, args?) =>
    setOverlayContent(() => [newOverlayContent, args]);
}

export function Overlay() {
  const [overlayConfig, setOverlayContent] = useAtom(OVERLAY_CONTENT_ATOM);
  const setOverlayActive = useSetAtom(OVERLAY_ACTIVE_ATOM);

  const closeFunc = () => setOverlayContent(null);

  useEffect(() => setOverlayActive(!!overlayConfig));

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
