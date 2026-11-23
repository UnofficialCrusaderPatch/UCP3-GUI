import { atomWithQuery } from 'jotai-tanstack-query';
import { LAST_CLICKED_CONTENT_ATOM } from '../state/atoms';
import { LANGUAGE_ATOM } from '../../../../function/gui-settings/settings';
import { descriptionQuery } from '../../../../function/content/discovery/descriptions';

// eslint-disable-next-line import/prefer-default-export
export const SELECTED_CONTENT_DESCRIPTION_ATOM = atomWithQuery((get) =>
  descriptionQuery(get(LAST_CLICKED_CONTENT_ATOM), get(LANGUAGE_ATOM)),
);
