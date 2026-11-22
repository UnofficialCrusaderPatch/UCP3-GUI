/* eslint-disable no-param-reassign */
import { atom } from 'jotai';
import {
  displayChildren,
  shouldBeIncluded,
} from '../../../../../../config/ucp/display-tree';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  DisplayConfigElement,
  OptionEntry,
} from '../../../../../../config/ucp/common';
import { optionEntriesToHierarchical } from '../../../../../../config/ucp/extension-util';
import { ConsoleLogger } from '../../../../../../util/scripts/logging';
import { LOCALIZED_UI_OPTION_ENTRIES_ATOM } from './localized-options';
import { SEARCH_RESULTS_ATOM } from './search';

function sumScore(
  scores: { [id: number]: number },
  d: DisplayConfigElement,
): number {
  if (d.id === undefined) return 0;
  if (displayChildren(d).length) {
    return (
      (scores[d.id] ?? 0) +
      displayChildren(d)
        .map((c) => sumScore(scores, c))
        .reduce((total, value) => total + value, 0)
    );
  }
  return scores[d.id] ?? 0;
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
    const idScoreMap: { [id: number]: number } = Object.fromEntries(
      results.map((r) => [r.id, r.score]),
    );

    ConsoleLogger.info('results', results);

    return all
      .filter((oe) => shouldBeIncluded(ids, oe))
      .sort((a, b) => {
        if (a.id !== undefined && b.id !== undefined) {
          const scoreA = sumScore(idScoreMap, a);
          const scoreB = sumScore(idScoreMap, b);
          return scoreB - scoreA;
        }
        return 0;
      });
  }

  return all;
});

export const LOCALIZED_UI_HIERARCHICAL_ATOM = atom((get) =>
  optionEntriesToHierarchical(
    get(FILTERED_OPTIONS) as unknown as OptionEntry[],
  ),
);
