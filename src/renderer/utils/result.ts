type Empty = undefined | null | void;
type NotEmpty<T> = T extends Empty ? never : T;

// Inspired by the "Result" and "Option" Enums from Rust and the "Optional" from Java
class Result<OK, ERR> {
  #content: NotEmpty<OK> | NotEmpty<ERR> | null;

  #success: boolean;

  #getOrNull(): NotEmpty<OK> | null {
    return this.#success ? (this.#content as NotEmpty<OK> | null) : null;
  }

  private constructor(
    content: NotEmpty<OK> | NotEmpty<ERR> | null,
    success: boolean
  ) {
    this.#content = content;
    this.#success = success;
  }

  isOk(): boolean {
    return this.#success;
  }

  isErr(): boolean {
    return !this.#success;
  }

  // get result, throws if empty ok result or ERR
  get(): NotEmpty<OK> | null {
    if (!this.#success) {
      throw new Error('Trying to get result of failed Result.');
    }
    if (this.#content !== null) {
      return this.#content as NotEmpty<OK>;
    }
    throw new Error('Trying to get result of empty Result.');
  }

  // get error, throws if empty error result or OK
  getError(): NotEmpty<ERR> | null {
    if (this.#success) {
      throw new Error('Trying to get error of successful Result.');
    }
    if (this.#content !== null) {
      return this.#content as NotEmpty<ERR>;
    }
    throw new Error('Trying to get error of empty Result.');
  }

  // get or either throw ERR, a given Error, or the error created by a function
  // NOTE: empty result throws its own error
  getOrThrow(
    error: undefined | Error | ((error: NotEmpty<ERR>) => Error)
  ): NotEmpty<OK> {
    const res = this.#getOrNull();
    if (res) {
      return res;
    }
    if (this.#content === null) {
      throw new Error('Trying to get result of empty Result.');
    }
    if (!error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw this.#content;
    }
    if (typeof error === 'function') {
      throw error(this.#content as NotEmpty<ERR>);
    }
    throw error;
  }

  // get or return the given value
  getOrElse(other: NotEmpty<OK>): NotEmpty<OK> {
    const res = this.#getOrNull();
    if (res) {
      return res;
    }
    return other;
  }

  // get or receive the given value
  getOrReceive(supplier: () => NotEmpty<OK>): NotEmpty<OK> {
    const res = this.#getOrNull();
    if (res) {
      return res;
    }
    return supplier();
  }

  // do something if ok
  ifOkDo(consumer: (result: NotEmpty<OK>) => void): void {
    const res = this.#getOrNull();
    if (res) {
      consumer(res);
    }
  }

  // map something if ok, the error will be lost
  map<T>(func: (result: NotEmpty<OK>) => NotEmpty<T>): Result<T, void> {
    if (!this.#success || this.#content === null) {
      return Result.emptyErr();
    }
    return Result.ok(func(this.#content as NotEmpty<OK>));
  }

  //* factories *//

  static ok<OK, ERR>(content: NotEmpty<OK>): Result<OK, ERR> {
    return new Result<OK, ERR>(content, true);
  }

  static err<OK, ERR>(content: NotEmpty<ERR>): Result<OK, ERR> {
    return new Result<OK, ERR>(content, false);
  }

  // ERR is just for typing
  static emptyOk<ERR>(): Result<void, ERR> {
    return new Result<void, ERR>(null, true);
  }

  // OK is just for typing
  static emptyErr<OK>(): Result<OK, void> {
    return new Result<OK, void>(null, false);
  }
}

export default Result;
