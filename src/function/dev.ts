import { getHexHashOfString, getHexHashOfFile } from 'util/scripts/hash';
import Logger from 'util/scripts/logging';
import {
  readDir,
  readAndFilterPaths,
  slashify,
  canonicalize,
} from 'tauri/tauri-files';
import { ZipReader, ZipWriter } from 'util/structs/zip-handler';

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
};

(globalThis as Record<string, unknown>).dev = dev;

LOGGER.msg('Initialized dev object in globalThis.').info();
