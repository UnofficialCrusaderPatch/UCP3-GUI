import { useCallback, useEffect, useState } from 'react';

/** Keep a control reachable while crossing the gap from its setting. */
export default function useHoverBridge(targetHovered: boolean, enabled = true) {
  const [controlHovered, setControlHovered] = useState(false);
  const [visible, setVisible] = useState(targetHovered);
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => setDismissed(true), []);

  useEffect(() => {
    if (!enabled) {
      setControlHovered(false);
      setVisible(false);
      return undefined;
    }
    if (targetHovered || controlHovered) {
      setVisible(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setVisible(false), 150);
    setDismissed(false);
    return () => window.clearTimeout(timer);
  }, [targetHovered, controlHovered, enabled]);

  return {
    visible: visible && !dismissed,
    dismiss,
    enter: () => setControlHovered(true),
    leave: () => setControlHovered(false),
  };
}
