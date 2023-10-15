// Inspired by the "Option" Enum from Rust and Optional from Java
// A bit weird decision: "null" and "undefined" might be the contained values.
// But then by contract.
export default class Option<T> {
  #content: T | undefined;

  #present: boolean;

  private constructor(content: T | undefined, present: boolean) {
    this.#content = content;
    this.#present = present;
  }

  isPresent(): boolean {
    return this.#present;
  }

  isEmpty(): boolean {
    return !this.#present;
  }

  // get content, throws if empty
  get(): T {
    if (this.isPresent()) {
      return this.#content as T;
    }
    throw new Error('Trying to get empty Option.');
  }

  // get or either throw a given Error, or the error created by a function
  getOrThrow(error: Error | (() => Error)): T {
    if (this.isPresent()) {
      return this.#content as T;
    }
    if (typeof error === 'function') {
      throw error();
    }
    throw error;
  }

  // get or return the given value
  getOrElse(other: T): T {
    if (this.isPresent()) {
      return this.#content as T;
    }
    return other;
  }

  // get or receive the given value
  getOrReceive(supplier: () => T): T {
    if (this.isPresent()) {
      return this.#content as T;
    }
    return supplier();
  }

  // do something if present
  ifPresent(consumer: (content: T) => void): void {
    if (this.isPresent()) {
      consumer(this.#content as T);
    }
  }

  map<U>(func: (content: T) => U): Option<U> {
    return this.isPresent()
      ? Option.of(func(this.#content as T))
      : (this as unknown as Option<U>);
  }

  // if the contained value is "null" or "undefined",
  // return an empty Option, else "this" unchanged
  notUndefinedOrNull(): Option<Exclude<T, undefined | null>> {
    if (
      this.isPresent() &&
      (this.#content === undefined || this.#content === null)
    ) {
      return Option.ofEmpty();
    }
    return this as Option<Exclude<T, undefined | null>>;
  }

  //* factories *//

  static of<T>(content: T): Option<T> {
    return new Option<T>(content, true);
  }

  static ofEmpty<T>(): Option<T> {
    return new Option<T>(undefined, false);
  }

  /** Simulates a Java Optional, since `undefined` or `null` will become empty */
  static ofNullable<T>(content: T): Option<NonNullable<T>> {
    // check fo null here includes undefined
    return content == null ? this.ofEmpty() : this.of(content);
  }
}
