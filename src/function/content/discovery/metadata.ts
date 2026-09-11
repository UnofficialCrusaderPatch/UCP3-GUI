export type FamilyMembership = { name: string; root?: boolean };

/** Extracted from the package's ordinary locale/<language>.yml tags.<id> keys. */
export type TagLocales = Record<string, Record<string, string>>;

export type DiscoveryMetadata = {
  family?: FamilyMembership[];
  tags?: string[];
  capabilities?: {
    files?: boolean;
    code?: boolean;
    configuration?: boolean;
    options?: boolean;
  };
};

export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.normalize('NFKC').trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

/** Invalid presentation metadata must not hide an otherwise usable extension. */
export function normalizeFamilies(value: unknown): FamilyMembership[] {
  if (!Array.isArray(value)) return [];
  const result: FamilyMembership[] = [];
  const valid = value.every((entry) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.name !== 'string' ||
      !entry.name.trim() ||
      (entry.root !== undefined && typeof entry.root !== 'boolean') ||
      result.some((f) => f.name === entry.name.trim())
    )
      return false;
    result.push({
      name: entry.name.trim(),
      ...(entry.root ? { root: true } : {}),
    });
    return true;
  });
  return valid ? result : [];
}

export function discoveryTags(
  metadata: DiscoveryMetadata,
  type: string,
): string[] {
  const facts = metadata.capabilities ?? {};
  return normalizeTags([
    ...normalizeTags(metadata.tags),
    type,
    ...(normalizeFamilies(metadata.family).length ? ['family'] : []),
    ...(facts.files === true ? ['files'] : []),
    ...(facts.code === true ? ['code'] : []),
    ...(facts.configuration === true ? ['config'] : []),
    ...(facts.options === true ? ['options'] : []),
  ]);
}

export type FamilyItem = {
  id: string;
  name: string;
  family?: FamilyMembership[];
  active?: boolean;
};

export type FamilyGroup<T> = {
  id: string;
  root: T;
  members: T[];
  contextual: boolean;
};

/** A view projection only: never modify the input order or extension state. */
export function groupFamilies<T extends FamilyItem>(
  visible: T[],
  available: T[],
): { groups: FamilyGroup<T>[]; ungrouped: T[] } {
  const roots = new Map<string, T[]>();
  available.forEach((item) =>
    normalizeFamilies(item.family).forEach((f) => {
      if (f.root) roots.set(f.name, [...(roots.get(f.name) ?? []), item]);
    }),
  );
  const groups: FamilyGroup<T>[] = [];
  const grouped = new Set<string>();
  roots.forEach((candidates, family) => {
    if (new Set(candidates.map((item) => item.name)).size !== 1) return;
    const members = visible.filter((item) =>
      normalizeFamilies(item.family).some((f) => f.name === family),
    );
    if (!members.length) return;
    const root =
      members.find((item) => candidates.some((r) => r.id === item.id)) ??
      candidates[0];
    groups.push({
      id: family,
      root,
      members: members.filter((item) => item.id !== root.id),
      contextual: !visible.some((item) => item.id === root.id),
    });
    members.forEach((item) => grouped.add(item.id));
  });
  return { groups, ungrouped: visible.filter((item) => !grouped.has(item.id)) };
}
