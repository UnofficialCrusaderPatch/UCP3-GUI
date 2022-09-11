/* eslint-disable import/prefer-default-export */
const fs = require('fs');
const yaml = require('yaml');

function readYAML(path: string) {
  const data = fs.readFileSync(path, { encoding: 'utf-8' });
  return yaml.parse(data);
}

export { readYAML };
