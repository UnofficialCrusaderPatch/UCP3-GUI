import { getHexHashOfString, getHexHashOfFile } from 'util/scripts/hash';
import { showModalCreatePlugin } from 'components/modals/modal-create-plugin';
import { showModalOk } from 'components/modals/modal-ok';
import { showModalOkCancel } from 'components/modals/modal-ok-cancel';
import Logger from 'util/scripts/logging';

const LOGGER = new Logger('dev.ts');

const dev = {
  getHexHashOfString,
  getHexHashOfFile,
  showModalCreatePlugin,
  showModalOk,
  showModalOkCancel,
};

(globalThis as Record<string, unknown>).dev = dev;

LOGGER.msg('Initialized dev object in globalThis.').info();
