const { body, param } = require('express-validator');

const availability = body('availability').isArray({ min: 1 }).withMessage('At least one availability period is required').bail().custom((items) => {
  const days = new Set();
  items.forEach((item) => {
    if (!Number.isInteger(Number(item.dayOfWeek)) || Number(item.dayOfWeek) < 1 || Number(item.dayOfWeek) > 7) throw new Error('Day must be between 1 and 7');
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(item.startTime) || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(item.endTime)) throw new Error('Time must use HH:mm or HH:mm:ss');
    const start = item.startTime.split(':').map(Number); const end = item.endTime.split(':').map(Number);
    if ((start[0] * 3600) + (start[1] * 60) + (start[2] || 0) >= (end[0] * 3600) + (end[1] * 60) + (end[2] || 0)) throw new Error('End time must be later than start time.');
    if (days.has(Number(item.dayOfWeek))) throw new Error('Duplicate availability day');
    days.add(Number(item.dayOfWeek));
  });
  return true;
});

const createPractitioner = [
  body('firstName').trim().notEmpty().isLength({ max: 100 }).withMessage('First name is required'),
  body('lastName').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('contactNumber').trim().matches(/^\+?[0-9]{7,15}$/).withMessage('Valid contact number is required'),
  body('specialization').optional({ nullable: true }).trim().isLength({ max: 150 }),
  availability,
];

const updatePractitioner = [
  param('id').isInt().withMessage('Practitioner id must be an integer'),
  body('firstName').trim().notEmpty().isLength({ max: 100 }).withMessage('First name is required'),
  body('lastName').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('newPassword').optional({ values: 'falsy' }).isString().isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('contactNumber').trim().matches(/^\+?[0-9]{7,15}$/).withMessage('Valid contact number is required'),
  body('specialization').optional({ nullable: true }).trim().isLength({ max: 150 }),
  availability,
];
module.exports = { createPractitioner, updatePractitioner };
