/* eslint-disable import/prefer-default-export */
import yaml from 'yaml';

const fs = require('fs');

function readYAML(path: string) {
  const data = fs.readFileSync(path, { encoding: 'utf-8' });
  return yaml.parse(data);
}

export { readYAML };
