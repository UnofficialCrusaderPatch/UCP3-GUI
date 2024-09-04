import { atom } from 'jotai';
import { Extension } from '../../../config/ucp/common';

// eslint-disable-next-line import/prefer-default-export
export const CONFIGURATION_DISK_STATE_ATOM = atom<Array<Extension>>([]);
