class AppError extends Error {
  constructor(message, statusCode, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

class BadRequestError extends AppError {
  constructor(message, errors) {
    super(message || 'Bad Request', 400, errors);
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message || 'Unauthorized', 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super(message || 'Forbidden', 403);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message || 'Not Found', 404);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message || 'Conflict', 409);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
