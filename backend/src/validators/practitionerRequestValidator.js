const { body, param } = require('express-validator');

const therapyPlanId = param('therapyPlanId')
  .isInt({ min: 1 })
  .withMessage('Therapy plan id must be a positive integer');

const acceptRequest = [therapyPlanId];

const rejectRequest = [
  therapyPlanId,
  body('rejectionReason')
    .isString()
    .withMessage('Rejection reason is required')
    .bail()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Rejection reason must be between 1 and 500 characters'),
];

module.exports = {
  therapyPlanId,
  acceptRequest,
  rejectRequest,
};