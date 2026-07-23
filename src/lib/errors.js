// Typed application error carrying an HTTP status and a stable machine code.
class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const badRequest = (msg, code = 'bad_request') => new AppError(400, code, msg);
const unauthorized = (msg = 'Authentication required', code = 'unauthorized') => new AppError(401, code, msg);
const forbidden = (msg = 'Not permitted', code = 'forbidden') => new AppError(403, code, msg);
const notFound = (msg = 'Not found', code = 'not_found') => new AppError(404, code, msg);
const conflict = (msg, code = 'conflict') => new AppError(409, code, msg);
const paymentRequired = (msg, code = 'payment_required') => new AppError(402, code, msg);

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  paymentRequired,
};
