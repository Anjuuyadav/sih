const { param } = require('express-validator');

const patientId = param('patientId')
  .isInt({ min: 1 })
  .withMessage('Patient id must be a positive integer');

const sessionId = param('sessionId')
  .isInt({ min: 1 })
  .withMessage('Session id must be a positive integer');

module.exports = {
  patientId,
  sessionId,
};
