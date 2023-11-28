import Option from 'util/structs/option';

export type JSType = {
  undefined: undefined;
  object: object;
  boolean: boolean;
  number: number;
  bigint: bigint;
  string: string;
  symbol: symbol;
  // eslint-disable-next-line @typescript-eslint/ban-types
  function: Function;
};

export function getPropertyIfExistsAndTypeOf<
  T extends Exclude<keyof JSType, 'undefined'>,
>(
  object: Record<string, unknown>,
  property: string,
  type: T,
): Option<JSType[T]> {
  // eslint-disable-next-line valid-typeof
  return object[property] !== undefined && typeof object[property] === type
    ? Option.of(object[property] as JSType[T])
    : Option.ofEmpty();
}

// source: https://stackoverflow.com/a/51250818
export function createSplitRange(left: number, right: number, parts: number) {
  const internParts = Math.round(parts);
  if (internParts < 1) {
    return [];
  }
  switch (internParts) {
    case 1:
      return [left];
    case 2:
      return [left, right];
    default: {
      const result = [];
      const delta = (right - left) / (internParts - 1);
      let runValue = left;
      // eslint-disable-next-line no-plusplus
      for (let index = 0; index < internParts - 1; ++index) {
        result.push(runValue);
        runValue += delta;
      }
      result.push(right);
      return result;
    }
  }
}
