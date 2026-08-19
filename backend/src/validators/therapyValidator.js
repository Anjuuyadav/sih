const { body, param } = require('express-validator');

const createTherapy = [

  body('therapyName')
    .trim()
    .notEmpty()
    .withMessage('TherapyName is required'),

  body('cost')
    .isFloat({ min: 0 })
    .withMessage('Cost must be greater than or equal to 0'),

  body('duration')
    .isInt({ min: 1 })
    .withMessage('Duration must be greater than 0'),

  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string'),

  body('isActive')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('IsActive must be true or false'),

];


const updateTherapy = [

  param('id')
    .isInt()
    .withMessage('Therapy id must be an integer'),

  body('therapyName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('TherapyName is required'),

  body('cost')
    .isFloat({ min: 0 })
    .withMessage('Cost must be greater than or equal to 0'),

  body('duration')
    .isInt({ min: 1 })
    .withMessage('Duration must be greater than 0'),

  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string'),

  body('isActive')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('IsActive must be true or false'),

];


module.exports = {
  createTherapy,
  updateTherapy,
};