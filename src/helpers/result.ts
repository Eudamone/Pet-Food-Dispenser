// result.ts
// Resultado explícito de una operación que puede fallar sin lanzar excepción.

export class Result<T> {
  private constructor(
    private readonly success: boolean,
    private readonly _value?: T,
    private readonly _error?: string,
  ) {}

  static ok<T>(value: T): Result<T> {
    return new Result<T>(true, value);
  }

  static fail<T>(error: string): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  get isOk(): boolean {
    return this.success;
  }

  get isFailure(): boolean {
    return !this.success;
  }

  get value(): T {
    if (!this.success) {
      throw new Error('Cannot read the value of a failed result');
    }
    return this._value as T;
  }

  get error(): string {
    return this._error ?? '';
  }
}
