import { DisplayConfigElement } from './common';

/** All supported descendant-bearing controls, including legacy switch sections. */
export function displayChildren(
  node: DisplayConfigElement,
): DisplayConfigElement[] {
  return 'children' in node && Array.isArray(node.children)
    ? node.children
    : [];
}

export function isDisplayContainer(node: DisplayConfigElement) {
  return ['Group', 'GroupBox', 'Modal'].includes(node.display);
}

/** Preserve a container if its own text or a visible descendant matches. */
export function shouldBeIncluded(
  included: Set<number>,
  node: DisplayConfigElement,
): boolean {
  if (node.hidden) return false;
  return (
    node.id === undefined ||
    included.has(node.id) ||
    displayChildren(node).some((child) => shouldBeIncluded(included, child))
  );
}
