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
