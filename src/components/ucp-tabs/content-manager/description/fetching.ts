import { atomWithQuery } from 'jotai-tanstack-query';
import { LAST_CLICKED_CONTENT_ATOM } from '../state/atoms';
import { ContentElement } from '../../../../function/content/types/content-element';
import { LANGUAGE_ATOM } from '../../../../function/gui-settings/settings';
import {
  descriptionQuery,
  inlineDescription,
} from '../../../../function/content/discovery/descriptions';

export function distillInlineDescription(
  element?: ContentElement,
  language = 'en',
) {
  return inlineDescription(element, language);
}

export const SELECTED_CONTENT_DESCRIPTION_ATOM = atomWithQuery((get) =>
  descriptionQuery(get(LAST_CLICKED_CONTENT_ATOM), get(LANGUAGE_ATOM)),
);
