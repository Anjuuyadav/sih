const express = require('express');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const bookingValidator = require('../validators/bookingValidator');

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  authorizeRoles('Patient'),
  bookingValidator.booking,
  bookingController.createBooking
);

module.exports = router;