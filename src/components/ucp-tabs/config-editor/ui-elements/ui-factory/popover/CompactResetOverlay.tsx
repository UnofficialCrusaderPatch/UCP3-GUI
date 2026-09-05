import { ReactElement, useEffect, useRef, useState } from 'react';
import { Overlay } from 'react-bootstrap';

/** Portal the reset control above the parchment without moving its setting. */
export default function CompactResetOverlay({
  children,
}: {
  children: ReactElement;
}) {
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const update = useRef<(() => void) | undefined>();

  useEffect(() => {
    if (!anchor) return undefined;
    const row = anchor.parentElement!;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    row.addEventListener('pointerenter', enter);
    row.addEventListener('pointerleave', leave);
    setHovered(row.matches(':hover'));
    const observer = new ResizeObserver(() => update.current?.());
    observer.observe(anchor);
    return () => {
      observer.disconnect();
      row.removeEventListener('pointerenter', enter);
      row.removeEventListener('pointerleave', leave);
    };
  }, [anchor]);

  return (
    <>
      <span
        ref={setAnchor}
        className="qualifier-reset-anchor"
        aria-hidden="true"
      />
      <Overlay
        show={!!anchor}
        transition={false}
        target={anchor}
        placement="left-start"
        popperConfig={{
          strategy: 'fixed',
          modifiers: [
            { name: 'flip', enabled: false },
            { name: 'preventOverflow', enabled: false },
            {
              name: 'resetBounds',
              enabled: true,
              phase: 'beforeWrite',
              fn: ({ state }) => {
                const rect = anchor!.getBoundingClientRect();
                const clip = anchor!
                  .closest('.config-container__content')
                  ?.getBoundingClientRect();
                // Escape horizontal clipping, but keep the original vertical scroll bounds.
                Object.assign(state.styles.popper, {
                  height: `${rect.height}px`,
                  clipPath: clip
                    ? `inset(${Math.max(0, clip.top - rect.top)}px 0 ${Math.max(0, rect.bottom - clip.bottom)}px 0)`
                    : undefined,
                });
              },
            },
          ],
        }}
      >
        {({ ref, style, popper }) => {
          update.current = popper?.scheduleUpdate;
          return (
            <div
              ref={ref}
              style={style}
              className="qualifier-reset-overlay"
              data-row-hovered={hovered}
            >
              {children}
            </div>
          );
        }}
      </Overlay>
    </>
  );
}
