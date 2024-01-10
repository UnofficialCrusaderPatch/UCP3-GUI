/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import './overlay.css';

import { useEffect, useRef } from 'react';
import { atom, useAtom } from 'jotai';
import { getStore } from '../../hooks/jotai/base';

type OverlayConfig<T> = [OverlayContent<T>, boolean, boolean, T] | null;
export type OverlayContentProps<T = undefined> = {
  closeFunc: () => void;
  args: T;
};
export type OverlayContent<T = undefined> = (
  props: OverlayContentProps<T>,
) => JSX.Element;

const OVERLAY_CONTENT_ATOM = atom<OverlayConfig<any>>(null);

export const OVERLAY_ACTIVE_ATOM = atom((get) => !!get(OVERLAY_CONTENT_ATOM));

export function setOverlayContent<T>(
  overlayContent: OverlayContent<T>,
  allowEsc: boolean = false, // if the user can close the overview with ESC, potentially ignoring intern listeners
  allowOutsideClick: boolean = false, // if the user can close the overview by clicking on the background, potentially ignoring intern listeners
  args?: T,
) {
  getStore().set(OVERLAY_CONTENT_ATOM, [
    overlayContent,
    allowEsc,
    allowOutsideClick,
    args,
  ]);
}

export function Overlay() {
  const [overlayConfig, setOverlayContentAtom] = useAtom(OVERLAY_CONTENT_ATOM);

  const overlayDiv = useRef<HTMLDivElement>(null);
  const closeFunc = () => setOverlayContentAtom(null);

  const overlayActive = !!overlayConfig;
  useEffect(() => {
    if (overlayActive) {
      overlayDiv.current?.focus();
    }
  });

  // no overlay
  if (!overlayActive) {
    return null;
  }

  const [OverlayContent, allowEsc, allowOutsideClick, args] = overlayConfig;
  return (
    <div
      ref={overlayDiv}
      className="overlay"
      tabIndex={allowEsc ? -1 : undefined}
      onKeyDown={
        allowEsc
          ? (event) => {
              if (event.key === 'Escape') {
                closeFunc();
              }
            }
          : undefined
      }
      onClick={
        allowOutsideClick
          ? (event) => {
              if (event.currentTarget === event.target) {
                closeFunc();
              }
            }
          : undefined
      }
    >
      <OverlayContent closeFunc={closeFunc} args={args} />
    </div>
  );
}
