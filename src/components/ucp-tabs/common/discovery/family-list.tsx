/* eslint-disable react/require-default-props */
import { ReactNode } from 'react';
import { atom, useAtom } from 'jotai';
import {
  FamilyItem,
  groupFamilies,
} from '../../../../function/content/discovery/metadata';
import { useMessage } from '../../../general/message';

const EXPANSION = atom<Record<string, boolean>>({});

// eslint-disable-next-line import/prefer-default-export
export function FamilyList<T extends FamilyItem>(props: {
  items: T[];
  available: T[];
  scope: string;
  searching: boolean;
  render: (item: T, familyToggle?: ReactNode) => ReactNode;
  label: (item: T) => string;
  activation?: boolean;
}) {
  const { items, available, scope, searching, render, label, activation } =
    props;
  const [expansion, setExpansion] = useAtom(EXPANSION);
  const localize = useMessage();
  // A root used as search context must still belong to this activation pane.
  // Otherwise an inactive preset can masquerade as an active child (and vice versa).
  const { groups, ungrouped } = groupFamilies(
    items,
    available.filter(
      (item) => activation === undefined || item.active === activation,
    ),
  );
  const positions = new Map(items.map((item, index) => [item.id, index]));
  const position = (entry: { root: T; members: T[] }) =>
    Math.min(
      ...[entry.root, ...entry.members].map(
        (item) => positions.get(item.id) ?? Infinity,
      ),
    );
  const entries = [
    ...groups,
    ...ungrouped.map((root) => ({
      id: `flat:${root.id}`,
      root,
      members: [] as T[],
      contextual: false,
    })),
  ].sort((left, right) => position(left) - position(right));
  return (
    <>
      {entries.map((group) => {
        const key = `${scope}:${searching ? 'search:' : ''}${group.id}`;
        const expanded = expansion[key] ?? searching;
        if (!group.members.length)
          return <div key={key}>{render(group.root)}</div>;
        return (
          <div key={key} className="discovery-family">
            <div className="discovery-family-root">
              {render(
                group.root,
                <button
                  type="button"
                  className="minimal-button discovery-family-toggle"
                  aria-expanded={expanded}
                  aria-label={localize({
                    key: expanded ? 'discovery.collapse' : 'discovery.expand',
                    args: { name: label(group.root) },
                  })}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpansion({ ...expansion, [key]: !expanded });
                  }}
                >
                  {expanded ? '▾' : '▸'}
                </button>,
              )}
            </div>
            {expanded && (
              <div className="discovery-family-members">
                {group.members.map((item) => (
                  <div key={item.id}>{render(item)}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
