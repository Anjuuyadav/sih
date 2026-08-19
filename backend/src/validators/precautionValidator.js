const { body, param } = require('express-validator');

const createPrecaution = [
  param('therapyId').isInt().withMessage('Therapy id must be an integer'),
  body('precautionType').isIn(['PRE', 'POST']).withMessage('Type must be either PRE or POST'),
  body('precautionText').trim().notEmpty().withMessage('Description is required'),
];

const updatePrecaution = [
  param('precautionId').isInt().withMessage('Precaution id must be an integer'),
  body('precautionType').optional().isIn(['PRE', 'POST']).withMessage('Type must be either PRE or POST'),
  body('precautionText').optional().trim().notEmpty().withMessage('Description is required'),
];

module.exports = {
  createPrecaution,
  updatePrecaution,
};
