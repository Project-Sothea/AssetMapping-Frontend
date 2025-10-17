/**
 * Result type for operations that can succeed or fail
 * This provides type-safe error handling without throwing exceptions
 */
export type Result<T, E = AppError> = { success: true; data: T } | { success: false; error: E };

/**
 * Error codes for different types of application errors
 */
export enum ErrorCode {
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  SYNC_ERROR = 'SYNC_ERROR',
  IMAGE_ERROR = 'IMAGE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Standard application error class
 */
export class AppError {
  constructor(
    public message: string,
    public code: ErrorCode = ErrorCode.UNKNOWN,
    public details?: unknown
  ) {}

  static fromUnknown(error: unknown): AppError {
    if (error instanceof AppError) return error;

    if (error instanceof Error) {
      return new AppError(error.message, ErrorCode.UNKNOWN, error);
    }

    return new AppError('An unknown error occurred', ErrorCode.UNKNOWN, error);
  }
}
