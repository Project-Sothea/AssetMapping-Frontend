import { Alert } from 'react-native';

export enum ErrorCode {
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  SYNC_ERROR = 'SYNC_ERROR',
  IMAGE_ERROR = 'IMAGE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

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

/**
 * Centralized error handling utilities
 */
export class ErrorHandler {
  /**
   * Convert unknown error to AppError
   */
  static handle(error: unknown, defaultMessage?: string): AppError {
    if (error instanceof AppError) return error;

    if (error instanceof Error) {
      // Map specific error types to error codes
      if (error.message.includes('network')) {
        return new AppError(error.message, ErrorCode.NETWORK_ERROR, error);
      }
      if (error.message.includes('not found')) {
        return new AppError(error.message, ErrorCode.NOT_FOUND, error);
      }
      return new AppError(error.message, ErrorCode.UNKNOWN, error);
    }

    return new AppError(defaultMessage || 'An unexpected error occurred', ErrorCode.UNKNOWN, error);
  }

  /**
   * Show error alert to user
   */
  static showAlert(error: AppError, title: string = 'Error'): void {
    Alert.alert(title, error.message);
  }

  /**
   * Log error for debugging
   */
  static log(error: AppError, context?: string): void {
    const prefix = context ? `[${context}]` : '';
    console.error(`${prefix} Error [${error.code}]:`, error.message, error.details);
  }
}
