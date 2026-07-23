const { AppError } = require('../lib/errors');
const { sendJson } = require('../lib/serialize');
const config = require('../lib/config');

// Central error handler. Emits the OpenAPI Error shape { code, message }.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return sendJson(res, err.status, { code: err.code, message: err.message });
  }
  // Zod validation errors
  if (err && err.name === 'ZodError') {
    return sendJson(res, 400, {
      code: 'validation_error',
      message: 'Invalid request body',
      details: err.errors,
    });
  }
  // Prisma known request errors (e.g. unique constraint)
  if (err && err.code === 'P2002') {
    return sendJson(res, 409, { code: 'conflict', message: 'Resource already exists' });
  }
  if (err && err.code === 'P2025') {
    return sendJson(res, 404, { code: 'not_found', message: 'Record not found' });
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  return sendJson(res, 500, {
    code: 'internal_error',
    message: config.isDev ? String(err && err.message) : 'Internal server error',
  });
}

function notFoundHandler(req, res) {
  return sendJson(res, 404, { code: 'not_found', message: `No route for ${req.method} ${req.path}` });
}

module.exports = { errorHandler, notFoundHandler };
