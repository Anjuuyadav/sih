const { body } = require('express-validator');


const createPractitioner = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters and include letters and numbers'),
];

const updatePractitioner = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  createPractitioner,
  updatePractitioner,
};
