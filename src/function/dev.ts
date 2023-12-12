import { getHexHashOfString, getHexHashOfFile } from 'util/scripts/hash';
import { showCreatePluginModalWindow } from 'components/modals/CreatePluginModal';
import { showModalOk } from 'components/modals/modal-ok';
import { showModalOkCancel } from 'components/modals/ModalOkCancel';
import Logger from 'util/scripts/logging';

const LOGGER = new Logger('dev.ts');

const dev = {
  getHexHashOfString,
  getHexHashOfFile,
  showCreatePluginModalWindow,
  showModalOk,
  showModalOkCancel,
};

(globalThis as Record<string, unknown>).dev = dev;

LOGGER.msg('Initialized dev object in globalThis.').info();
