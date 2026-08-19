const { validationResult } = require('express-validator');
const bookingService = require('../services/bookingService');
const responseHelper = require('../utils/responseHelper');

const createBooking = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors.array());
    }

    const booking = await bookingService.createBooking(req.body, req.user);
    return responseHelper.created(res, {
      success: true,
      message: 'Booking request submitted successfully and is awaiting practitioner approval.',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking };