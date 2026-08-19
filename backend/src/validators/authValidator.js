const { body } = require('express-validator');


const register = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('contactNumber')
    .customSanitizer((value) => String(value || '').trim().replace(/\s+/g, ''))
    .notEmpty()
    .withMessage('Contact number is required')
    .bail()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Contact number must be a valid 10-digit Indian mobile number'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters and include letters and numbers'),
];

const login = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  register,
  login,
};
