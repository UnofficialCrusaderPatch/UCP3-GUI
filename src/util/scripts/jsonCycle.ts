// allow support for removing cycling references for json serialization
import '../support/cycle';

export default JSON as JSON & {
  decycle: (value: unknown, replacer?: unknown) => unknown;
  retrocycle: (value: unknown) => unknown;
};
