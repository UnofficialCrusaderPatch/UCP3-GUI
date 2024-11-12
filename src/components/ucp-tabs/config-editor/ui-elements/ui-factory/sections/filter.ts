/* eslint-disable no-param-reassign */
import { atom } from 'jotai';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  DisplayConfigElement,
  OptionEntry,
} from '../../../../../../config/ucp/common';
import { optionEntriesToHierarchical } from '../../../../../../config/ucp/extension-util';
import { ConsoleLogger } from '../../../../../../util/scripts/logging';
import { LOCALIZED_UI_OPTION_ENTRIES_ATOM } from './localized-options';
import { SEARCH_RESULTS_ATOM } from './search';

function isIncluded(included: Set<number>, d: DisplayConfigElement) {
  if (d.id !== undefined) {
    return included.has(d.id);
  }
  return true;
}

function shouldBeIncluded(included: Set<number>, d: DisplayConfigElement) {
  if (isIncluded(included, d)) return true;

  if (d.display === 'Group' || d.display === 'GroupBox') {
    // eslint-disable-next-line no-restricted-syntax
    for (const child of d.children) {
      if (shouldBeIncluded(included, child)) return true;
    }
  }

  return false;
}

/**
 * Note that the filtering doesn't filter children of Group and GroupBox elements
 * So if any of the children of a Group should be included, then the entire Group
 * is included.
 */
export const FILTERED_OPTIONS = atom((get) => {
  const all = get(LOCALIZED_UI_OPTION_ENTRIES_ATOM);

  const results = get(SEARCH_RESULTS_ATOM);
  if (results) {
    const ids = new Set(results.map((sr) => sr.id));

    ConsoleLogger.info(results);

    return all.filter((oe) => shouldBeIncluded(ids, oe));
  }

  return all;
});

export const LOCALIZED_UI_HIERARCHICAL_ATOM = atom((get) =>
  optionEntriesToHierarchical(
    get(FILTERED_OPTIONS) as unknown as OptionEntry[],
  ),
);
