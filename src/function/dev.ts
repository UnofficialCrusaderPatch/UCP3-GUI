import {
  readDir,
  readAndFilterPaths,
  slashify,
  canonicalize,
} from '../tauri/tauri-files';
import { getHexHashOfString, getHexHashOfFile } from '../util/scripts/hash';
import { showModalCreatePlugin } from '../components/modals/modal-create-plugin';
import { showModalOk } from '../components/modals/modal-ok';
import { showModalOkCancel } from '../components/modals/modal-ok-cancel';
import Logger from '../util/scripts/logging';
import { ZipReader, ZipWriter } from '../util/structs/zip-handler';
import { TOAST_TYPE, makeToast } from '../components/toasts/toasts-display';
import { download, upload } from '../tauri/tauri-http';

const LOGGER = new Logger('dev.ts');

const dev = {
  getHexHashOfString,
  getHexHashOfFile,
  readDir,
  readAndFilterPaths,
  ZipReader,
  ZipWriter,
  slashify,
  canonicalize,
  showModalCreatePlugin,
  showModalOk,
  showModalOkCancel,
  TOAST_TYPE,
  makeToast,
  download,
  upload,
};

(globalThis as Record<string, unknown>).dev = dev;

LOGGER.msg('Initialized dev object in globalThis.').info();
