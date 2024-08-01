import { atomWithQuery } from 'jotai-tanstack-query';
import { fetchDescription } from '../../../../function/content/store/fetch';
import { CONTENT_INTERFACE_STATE_ATOM } from '../state/atoms';
import { ContentElement } from '../../../../function/content/types/content-element';

export const chooseSingleFromSelection = (selected: ContentElement[]) => {
  if (selected.length < 1) return undefined;

  const d = selected.at(-1);

  return d!;
};

export const distillInlineDescription = (e?: ContentElement) => {
  if (e === undefined) return '';

  const descriptionSources = e.sources.description.filter(
    (dc) => dc.method === 'inline',
  );

  if (descriptionSources.length === 0) {
    return '';
  }

  return descriptionSources.at(0)!.content;
};

// TODO: implement locale
const resolveDescription = async ({
  queryKey: [, e],
}: {
  queryKey: [string, ContentElement?];
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

    if (e.extension !== undefined) {
      return e.extension.io.fetchDescription();
    }

    return new Promise((resolve) => {
      resolve(inlineDescriptionSources.at(-1)!.content || "missing 'content'");
    });
  }

  const { url } = onlineDescriptionSources.at(0)!;

  return fetchDescription(url);
};

export const SELECTED_CONTENT_DESCRIPTION_ATOM = atomWithQuery((get) => ({
  queryKey: [
    'description',
    chooseSingleFromSelection(get(CONTENT_INTERFACE_STATE_ATOM).selected),
  ] as [string, ContentElement?],
  queryFn: resolveDescription,
  retry: false,
  staleTime: Infinity,
  placeholderData: () =>
    distillInlineDescription(
      chooseSingleFromSelection(get(CONTENT_INTERFACE_STATE_ATOM).selected),
    ),
}));
