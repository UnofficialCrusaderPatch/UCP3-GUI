import { useMemo } from 'react';
import { useQueries, UseQueryResult } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { ContentElement } from '../../../../function/content/types/content-element';
import {
  descriptionQuery,
  inlineDescription,
  ResolvedDescription,
} from '../../../../function/content/discovery/descriptions';
import { discoveryTags } from '../../../../function/content/discovery/metadata';
import {
  createDiscoverySearch,
  DiscoveryFilter,
} from '../../../../function/content/discovery/search';
import { LANGUAGE_ATOM } from '../../../../function/gui-settings/settings';
import { createExtensionID } from '../../../../function/global/constants/extension-id';
import { useMessage } from '../../../general/message';

export const KNOWN_TAGS = [
  'ai',
  'aiv',
  'aic',
  'aia',
  'balance',
  'bugfixes',
  'code',
  'config',
  'maps',
  'modpack',
  'scenarios',
  'sounds',
  'textures',
  'tools',
  'behavior',
  'files',
  'options',
  'family',
  'plugin',
  'module',
];

const combineDescriptions = (
  results: UseQueryResult<ResolvedDescription>[],
) => ({
  data: results.map((result) => result.data),
  pending: results.filter((result) => result.isPending).length,
  incomplete: results.filter(
    (result) => result.isError || result.data?.incomplete,
  ).length,
});

export function useDiscovery(
  elements: ContentElement[],
  filter: DiscoveryFilter,
) {
  const language = useAtomValue(LANGUAGE_ATOM);
  const localize = useMessage();
  const descriptions = useQueries({
    queries: elements.map((element) => descriptionQuery(element, language)),
    combine: combineDescriptions,
  });
  const documents = useMemo(
    () =>
      elements.map((element, i) => {
        const tags = discoveryTags(element.definition, element.definition.type);
        return {
          id: createExtensionID(element),
          name: element.definition.name,
          displayName:
            element.definition['display-name'] || element.definition.name,
          description:
            descriptions.data[i]?.text ?? inlineDescription(element, language),
          tags,
          tagText: tags
            .map(
              (tag) =>
                `${tag} ${KNOWN_TAGS.includes(tag) ? localize(`discovery.tag.${tag}`) : tag}`,
            )
            .join(' '),
        };
      }),
    [elements, descriptions.data, language, localize],
  );
  const search = useMemo(
    () => createDiscoverySearch(documents, language),
    [documents, language],
  );
  const results = useMemo(() => search(filter), [search, filter]);
  const tags = useMemo(
    () =>
      [...new Set(documents.flatMap((doc) => doc.tags))].sort().map((tag) => ({
        value: tag,
        label: KNOWN_TAGS.includes(tag)
          ? localize(`discovery.tag.${tag}`)
          : tag,
      })),
    [documents, localize],
  );
  return {
    results,
    tags,
    pending: descriptions.pending,
    incomplete: descriptions.incomplete,
  };
}
