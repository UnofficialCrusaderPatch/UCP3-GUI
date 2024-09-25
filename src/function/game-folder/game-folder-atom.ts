import { atom } from 'jotai';

/**
 * Holds the game folder (string) that is currently active.
 * Generally this is also set on start to the previously active value.
 *
 * From a programming perspective, this is
 * the entry point of the modding framework configuration logic.
 * If this is changed, many update callbacks are called throughout the code.
 */
// eslint-disable-next-line import/prefer-default-export
export const GAME_FOLDER_ATOM = atom('');
