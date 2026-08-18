const { ForbiddenError } = require('../utils/errors');

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new ForbiddenError('You do not have permission to access this resource'));
  }
  next();
};

module.exports = authorizeRoles;
