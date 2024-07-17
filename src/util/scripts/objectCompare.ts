import deepEqual from 'deep-equal';

// eslint-disable-next-line import/prefer-default-export
export function compareObjects(o: unknown, p: unknown) {
  return deepEqual(o, p);
}
