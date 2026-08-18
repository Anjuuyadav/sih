const responseHelper = require('../utils/responseHelper');

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

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
