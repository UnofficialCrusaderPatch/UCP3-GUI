/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/require-default-props */
import './overlay.css';

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { atom, useAtomValue } from 'jotai';
import { getStore } from '../../hooks/jotai/base';

// Render-prop contract used by overlay content, including external callers.
// eslint-disable-next-line react/no-unused-prop-types
export type OverlayContentProps<T = undefined> = {
  // eslint-disable-next-line react/no-unused-prop-types
  closeFunc: () => void;
  args: T;
};
export type OverlayContent<T = undefined> = (
  props: OverlayContentProps<T>,
) => ReactNode;

type OverlayEntry = {
  id: number;
  Content: OverlayContent<any>;
  allowEsc: boolean;
  allowOutsideClick: boolean;
  args: any;
  preserveParent: boolean;
  opener: HTMLElement | null;
  onClose?: () => void;
};
const OVERLAY_CONTENT_ATOM = atom<OverlayEntry[]>([]);
let nextId = 0;
export const OVERLAY_ACTIVE_ATOM = atom(
  (get) => get(OVERLAY_CONTENT_ATOM).length > 0,
);

function closeOverlay(id: number) {
  const store = getStore();
  const stack = store.get(OVERLAY_CONTENT_ATOM);
  const index = stack.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  const remaining = stack.slice(0, index);
  store.set(OVERLAY_CONTENT_ATOM, remaining);
  stack
    .slice(index)
    .reverse()
    .forEach((entry) => entry.onClose?.());
  // Wait until the preserved parent is visible again.
  queueMicrotask(() => {
    if (
      store.get(OVERLAY_CONTENT_ATOM) === remaining &&
      stack[index].opener?.isConnected
    )
      stack[index].opener?.focus();
  });
}

export function setOverlayContent<T>(
  Content: OverlayContent<T>,
  allowEsc = false,
  allowOutsideClick = false,
  args?: T,
  options: { preserveParent?: boolean; onClose?: () => void } = {},
) {
  const store = getStore();
  const stack = store.get(OVERLAY_CONTENT_ATOM);
  const preserve = stack.some((entry) => entry.preserveParent);
  nextId += 1;
  const entry: OverlayEntry = {
    id: nextId,
    Content,
    allowEsc,
    allowOutsideClick,
    args,
    preserveParent: options.preserveParent ?? false,
    onClose: options.onClose,
    opener:
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null,
  };
  store.set(OVERLAY_CONTENT_ATOM, [...(preserve ? stack : []), entry]);
  if (!preserve) stack.forEach((old) => old.onClose?.());
  return () => closeOverlay(entry.id);
}

/** Clear the entire stack when leaving its configuration context. */
export function forceClearOverlayContent() {
  const first = getStore().get(OVERLAY_CONTENT_ATOM)[0];
  if (first) closeOverlay(first.id);
}

export function BlankOverlayContent() {
  return null;
}

function PortalMount({
  args,
}: OverlayContentProps<(node: HTMLDivElement | null) => void>) {
  return <div className="overlay-portal" ref={args} />;
}

/** Keep descendants in their original React/state context, with live props. */
export function OverlayPortal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const [mount, setMount] = useState<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    let mounted = true;
    const close = setOverlayContent(PortalMount, true, true, setMount, {
      preserveParent: true,
      onClose: () => {
        if (mounted) closeRef.current();
      },
    });
    return () => {
      // React StrictMode rehearses cleanup while the opener remains mounted.
      // Removing our registration must not dispatch a user Close to the opener.
      mounted = false;
      close();
    };
  }, []);
  return mount ? createPortal(children, mount) : null;
}

function OverlayFrame({
  entry,
  active,
}: {
  entry: OverlayEntry;
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { Content, allowEsc, allowOutsideClick, args } = entry;
  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return undefined;
    if (!node.contains(document.activeElement)) node.focus();
    const containFocus = (event: FocusEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[role=dialog][aria-modal=true]') &&
        !node.contains(event.target)
      )
        return;
      if (event.target instanceof Node && !node.contains(event.target))
        node.focus();
    };
    document.addEventListener('focusin', containFocus);
    return () => document.removeEventListener('focusin', containFocus);
  }, [active]);
  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && allowEsc) {
        event.preventDefault();
        event.stopPropagation();
        closeOverlay(entry.id);
      }
      if (event.key === 'Tab') {
        const nodes = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button, input, select, textarea, a[href], iframe, [tabindex]',
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(':disabled') &&
            !element.closest('[hidden], [inert]') &&
            element.getClientRects().length > 0,
        );
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (
          !first ||
          (event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === node)) ||
          (!event.shiftKey &&
            (document.activeElement === last ||
              document.activeElement === node))
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }
    };
    const onClick = (event: MouseEvent) => {
      if (allowOutsideClick && event.target === node) closeOverlay(entry.id);
    };
    // Native bubbling also receives events from portals; children can consume Escape first.
    node.addEventListener('keydown', onKeyDown);
    node.addEventListener('click', onClick);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      node.removeEventListener('click', onClick);
    };
  }, [active, allowEsc, allowOutsideClick, entry.id]);
  return (
    <div ref={ref} className="overlay" hidden={!active} tabIndex={-1}>
      <Content closeFunc={() => closeOverlay(entry.id)} args={args} />
    </div>
  );
}

export function Overlay() {
  const stack = useAtomValue(OVERLAY_CONTENT_ATOM);
  return (
    <>
      {stack.map((entry, index) => (
        <OverlayFrame
          key={entry.id}
          entry={entry}
          active={index === stack.length - 1}
        />
      ))}
    </>
  );
}
