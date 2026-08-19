const { body } = require('express-validator');

const booking = [
  body('therapyId')
    .isInt({ min: 1 })
    .withMessage('Therapy id must be a positive integer'),
  body('numberOfSessions')
    .isInt({ min: 1 })
    .withMessage('Number of sessions must be greater than zero'),
  body('preferredStartDate')
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Preferred start date must use YYYY-MM-DD'),
  body('preferredDays')
    .isArray({ min: 1 })
    .withMessage('Preferred days are required')
    .bail()
    .custom((days) => {
      const numericDays = days.map(Number);
      if (numericDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
        throw new Error('Preferred days must contain values from 1 to 7');
      }
      if (new Set(numericDays).size !== numericDays.length) {
        throw new Error('Preferred days cannot contain duplicates');
      }
      return true;
    }),
  body('preferredTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
    .withMessage('Preferred time must use HH:mm or HH:mm:ss'),
  body('practitionerId')
    .isInt({ min: 1 })
    .withMessage('Practitioner id must be a positive integer'),
  body('schedule')
    .isArray({ min: 1 })
    .withMessage('Schedule is required')
    .bail()
    .custom((schedule) => {
      if (schedule.some((item) => !item || typeof item !== 'object')) {
        throw new Error('Each schedule entry must be an object');
      }
      return true;
    }),
];

module.exports = { booking };