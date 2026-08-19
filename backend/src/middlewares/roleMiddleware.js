const { ForbiddenError } = require('../utils/errors');

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  const userRole = String(req.user?.role || '').trim().toLowerCase();
  const roles = allowedRoles.map((role) => String(role).trim().toLowerCase());
  if (!roles.includes(userRole)) {
    return next(new ForbiddenError('You do not have permission to access this resource'));
  }
  next();
};

module.exports = authorizeRoles;
