import { atomWithQuery } from 'jotai-tanstack-query';
import {
  fetchDescription,
  InlineDescriptionContent,
  OnlineDescriptionContent,
} from '../../../../function/content/store/fetch';
import { LAST_CLICKED_CONTENT_ATOM } from '../state/atoms';
import { ContentElement } from '../../../../function/content/types/content-element';

export function distillInlineDescription(e?: ContentElement) {
  if (e === undefined) return '';

  const descriptionSources = e.contents.description.filter(
    (dc) => dc.method === 'inline',
  );

  if (descriptionSources.length === 0) {
    return '';
  }

  return (descriptionSources.at(0)! as InlineDescriptionContent).content;
}

// TODO: implement locale
async function resolveDescription({
  queryKey: [, e],
}: {
  queryKey: [string, ContentElement?];
}) {
  if (e === undefined)
    return new Promise((resolve) => {
      resolve('');
    });

  const onlineDescriptionSources = e.contents.description.filter(
    (dc) => dc.method === 'online',
  );

  if (onlineDescriptionSources.length === 0) {
    const inlineDescriptionSources = e.contents.description.filter(
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
      resolve(
        /* todo:locale: */
        (inlineDescriptionSources.at(-1)! as InlineDescriptionContent)
          .content || "missing 'content'",
      );
    });
  }

  const { url } = onlineDescriptionSources.at(0)! as OnlineDescriptionContent;

  return fetchDescription(url);
}

export const SELECTED_CONTENT_DESCRIPTION_ATOM = atomWithQuery((get) => ({
  queryKey: ['description', get(LAST_CLICKED_CONTENT_ATOM)] as [
    string,
    ContentElement?,
  ],
  queryFn: resolveDescription,
  retry: false,
  staleTime: Infinity,
  placeholderData: () =>
    distillInlineDescription(get(LAST_CLICKED_CONTENT_ATOM)),
}));
