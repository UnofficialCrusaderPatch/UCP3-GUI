import { getHexHashOfString, getHexHashOfFile } from 'util/scripts/hash';
import Logger from 'util/scripts/logging';

const LOGGER = new Logger('dev.ts');

const dev = {
  getHexHashOfString,
  getHexHashOfFile,
};

(globalThis as Record<string, unknown>).dev = dev;

LOGGER.msg('Initialized dev object in globalThis.').info();
