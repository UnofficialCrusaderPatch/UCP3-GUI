/* eslint-disable react/require-default-props */
import { ReactNode } from 'react';
import { atom, useAtom } from 'jotai';
import {
  FamilyItem,
  groupFamilies,
} from '../../../../function/content/discovery/metadata';
import { useMessage } from '../../../general/message';

const EXPANSION = atom<Record<string, boolean>>({});

export type FamilyRow = { displayName: string; selected: boolean };

// eslint-disable-next-line import/prefer-default-export
export function FamilyList<T extends FamilyItem>(props: {
  items: T[];
  available: T[];
  scope: string;
  searching: boolean;
  render: (item: T, familyToggle?: ReactNode, row?: FamilyRow) => ReactNode;
  label: (item: T) => string;
  familyLabel?: (family: string, root: T) => string;
  configurationLabel?: (family: string, item: T) => string;
  selected?: T[];
  activation?: boolean;
}) {
  const {
    items,
    available,
    scope,
    searching,
    render,
    label,
    activation,
    selected,
    familyLabel,
    configurationLabel,
  } = props;
  const [expansion, setExpansion] = useAtom(EXPANSION);
  const localize = useMessage();
  // A root used as search context must still belong to this activation pane.
  // Otherwise an inactive preset can masquerade as an active child (and vice versa).
  const { groups, ungrouped } = groupFamilies(
    items,
    available.filter(
      (item) =>
        selected !== undefined ||
        activation === undefined ||
        item.active === activation,
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
        if (group.id.startsWith('flat:'))
          return selected && group.root.active ? null : (
            <div key={key}>{render(group.root)}</div>
          );
        if (
          !available.some(
            (item) =>
              item.name !== group.root.name &&
              item.family?.some((family) => family.name === group.id),
          )
        )
          return selected && group.root.active ? null : (
            <div key={key}>{render(group.root)}</div>
          );
        const choice = selected?.find((item) =>
          item.family?.some((family) => family.name === group.id),
        );
        const shown = choice ?? group.root;
        const displayName = `${familyLabel?.(group.id, group.root) ?? label(group.root)}: ${configurationLabel?.(group.id, shown) ?? label(shown)}`;
        const choices = [group.root, ...group.members].filter(
          (item) => item.id !== shown.id,
        );
        return (
          <div key={key} className="discovery-family">
            <div className="discovery-family-root">
              {render(
                shown,
                <button
                  type="button"
                  className="minimal-button discovery-family-toggle"
                  aria-expanded={expanded}
                  aria-label={localize({
                    key: expanded ? 'discovery.collapse' : 'discovery.expand',
                    args: {
                      name:
                        familyLabel?.(group.id, group.root) ??
                        label(group.root),
                    },
                  })}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpansion({ ...expansion, [key]: !expanded });
                  }}
                >
                  {expanded ? '▾' : '▸'}
                </button>,
                { displayName, selected: choice !== undefined },
              )}
            </div>
            {expanded && (
              <div className="discovery-family-members">
                {choices.map((item) => (
                  <div key={item.id}>
                    {render(item, undefined, {
                      displayName:
                        configurationLabel?.(group.id, item) ?? label(item),
                      selected: false,
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
