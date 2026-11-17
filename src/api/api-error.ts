export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string, readonly data?: unknown) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
  }
}