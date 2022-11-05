// Inspired by the "Option" Enum from Rust and Optional from Java
// A bit weird decision: "null" and "undefined" might be the contained values.
// But then by contract.
export default class Option<T> {
  #content: T | null;

  #present: boolean;

  private constructor(content: T | null, present: boolean) {
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
    if (this.#present) {
      return this.#content as T;
    }
    throw new Error('Trying to get empty Option.');
  }

  // get or either throw a given Error, or the error created by a function
  getOrThrow(error: Error | (() => Error)): T {
    if (this.#present) {
      return this.#content as T;
    }
    if (typeof error === 'function') {
      throw error();
    }
    throw error;
  }

  // get or return the given value
  getOrElse(other: T): T {
    if (this.#present) {
      return this.#content as T;
    }
    return other;
  }

  // get or receive the given value
  getOrReceive(supplier: () => T): T {
    if (this.#present) {
      return this.#content as T;
    }
    return supplier();
  }

  // do something if present
  ifPresent(consumer: (content: T) => void): void {
    if (this.#present) {
      consumer(this.#content as T);
    }
  }

  map<U>(func: (content: T) => U): Option<U> {
    return this.#present
      ? Option.of(func(this.#content as T))
      : (this as unknown as Option<U>);
  }

  // if the contained value is "null" or "undefined",
  // return an empty Option, else "this" unchanged
  notUndefinedOrNull(): Option<T> {
    if (
      this.#present &&
      (this.#content === undefined || this.#content === null)
    ) {
      return Option.ofEmpty();
    }
    return this;
  }

  //* factories *//

  static of<T>(content: T): Option<T> {
    return new Option<T>(content, true);
  }

  static ofEmpty<T>(): Option<T> {
    return new Option<T>(null, false);
  }
}
