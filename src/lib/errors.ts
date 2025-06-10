// Custom error types for more specific error handling in the application

export class CommentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommentValidationError';
  }
}

export class CommentPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommentPermissionError';
  }
}

export class CommentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommentNotFoundError';
  }
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
} 