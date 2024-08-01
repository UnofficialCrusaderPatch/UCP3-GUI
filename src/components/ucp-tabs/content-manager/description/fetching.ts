import { atomWithQuery } from 'jotai-tanstack-query';
import {
  ExtensionContent,
  fetchDescription,
} from '../../../../function/content/store/fetch';
import { CONTENT_INTERFACE_STATE_ATOM } from '../state/atoms';

export const chooseSingleFromSelection = (selected: ExtensionContent[]) => {
  if (selected.length < 1) return undefined;

  const d = selected.at(-1);

  return d!;
};

export const distillInlineDescription = (e?: ExtensionContent) => {
  if (e === undefined) return '';

  const descriptionSources = e.sources.description.filter(
    (dc) => dc.method === 'inline',
  );

  if (descriptionSources.length === 0) {
    return '';
  }

  return descriptionSources.at(0)!.content;
};

const resolveDescription = async ({
  queryKey: [, e],
}: {
  queryKey: [string, ExtensionContent?];
}) => {
  if (e === undefined)
    return new Promise((resolve) => {
      resolve('');
    });

  const onlineDescriptionSources = e.sources.description.filter(
    (dc) => dc.method === 'online',
  );

  if (onlineDescriptionSources.length === 0) {
    const inlineDescriptionSources = e.sources.description.filter(
      (dc) => dc.method === 'inline',
    );

    if (inlineDescriptionSources.length === 0) {
      return new Promise((resolve) => {
        resolve('');
      });
    }

    return new Promise((resolve) => {
      resolve(inlineDescriptionSources.at(-1)!.content);
    });
  }

  const { url } = onlineDescriptionSources.at(0)!;

  return fetchDescription(url);
};

export const SELECTED_CONTENT_DESCRIPTION_ATOM = atomWithQuery((get) => ({
  queryKey: [
    'description',
    chooseSingleFromSelection(get(CONTENT_INTERFACE_STATE_ATOM).selected),
  ] as [string, ExtensionContent?],
  queryFn: resolveDescription,
  retry: false,
  staleTime: Infinity,
  placeholderData: () =>
    distillInlineDescription(
      chooseSingleFromSelection(get(CONTENT_INTERFACE_STATE_ATOM).selected),
    ),
}));
