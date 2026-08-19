const responseHelper = require('../utils/responseHelper');

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  if (err.number === 208) message = 'Admin database tables are unavailable. Execute backend/sql/schema.sql.';
  if (err.number === 547) message = 'Unable to delete this record because it is referenced by existing records.';
  if (err.number === 2627 || err.number === 2601) message = 'A record with the same unique value already exists.';
  if (statusCode >= 500) console.error(err);

  if (err.errors) {
    return responseHelper.validationError(res, err.errors);
  }

  switch (statusCode) {
    case 400:
      return responseHelper.badRequest(res, { message });
    case 401:
      return responseHelper.unauthorized(res, { message });
    case 403:
      return responseHelper.forbidden(res, { message });
    case 404:
      return responseHelper.notFound(res, { message });
    case 409:
      return responseHelper.conflict(res, { message });
    default:
      return responseHelper.internalError(res, { message });
  }
};

module.exports = errorMiddleware;
