const env = require('../config/env');
const { ZodError } = require('zod');
const multer = require('multer');

/**
 * Global error handler middleware.
 * Handles different error types and formats consistent error responses.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`, env.isDev ? err.stack : '');

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors,
    });
  }

  // Multer errors (file upload)
  if (err instanceof multer.MulterError) {
    let message = 'File upload error.';
    let statusCode = 400;

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${Math.round(env.maxFileSize / 1024 / 1024)}MB.`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected file field: ${err.field}`;
        break;
      default:
        message = err.message;
    }

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  // JWT errors
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired.',
    });
  }

  // Custom application errors with status codes
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(env.isDev && { stack: err.stack }),
    });
  }

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists.',
      ...(env.isDev && { detail: err.detail }),
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record not found.',
      ...(env.isDev && { detail: err.detail }),
    });
  }

  // PostgreSQL not-null constraint violation
  if (err.code === '23502') {
    return res.status(400).json({
      success: false,
      message: `Missing required field: ${err.column}`,
      ...(env.isDev && { detail: err.detail }),
    });
  }

  // Syntax error in request body (malformed JSON)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body.',
    });
  }

  // Default: Internal server error
  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: env.isDev ? err.message : 'Internal server error.',
    ...(env.isDev && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
