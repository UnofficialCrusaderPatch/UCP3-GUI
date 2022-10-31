import Option from './option';

// Inspired by the "Result" Enum from Rust
export default class Result<OK, ERR> {
  #content: OK | ERR;

  #success: boolean;

  private constructor(content: OK | ERR, success: boolean) {
    this.#content = content;
    this.#success = success;
  }

  isOk(): boolean {
    return this.#success;
  }

  isErr(): boolean {
    return !this.#success;
  }

  ok(): Option<OK> {
    return this.#success ? Option.of(this.#content as OK) : Option.ofEmpty();
  }

  err(): Option<ERR> {
    return !this.#success ? Option.of(this.#content as ERR) : Option.ofEmpty();
  }

  map<T>(func: (result: Result<OK, ERR>) => T): T {
    return func(this);
  }

  mapOk<T>(func: (ok: OK) => T): Result<T, ERR> {
    let res = this as unknown as Result<T, ERR>;
    this.ok().ifPresent((ok) => {
      res = Result.ok(func(ok));
    });
    return res;
  }

  mapErr<T>(func: (err: ERR) => T): Result<OK, T> {
    let res = this as unknown as Result<OK, T>;
    this.err().ifPresent((error) => {
      res = Result.err(func(error));
    });
    return res;
  }

  throwIfErr() {
    if (!this.#success) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw this.err().getOrThrow(() => new Error('Result contains an error.'));
    }
  }

  //* factories *//

  static ok<OK, ERR>(content: OK): Result<OK, ERR> {
    return new Result<OK, ERR>(content, true);
  }

  static err<OK, ERR>(content: ERR): Result<OK, ERR> {
    return new Result<OK, ERR>(content, false);
  }

  static emptyOk<ERR>(): Result<void, ERR> {
    return new Result<void, ERR>(undefined, true);
  }

  static emptyErr<OK>(): Result<OK, void> {
    return new Result<OK, void>(undefined, true);
  }
}
