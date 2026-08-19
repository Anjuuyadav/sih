const { validationResult } = require('express-validator');
const availabilityService = require('../services/availabilityService');
const responseHelper = require('../utils/responseHelper');

const searchAvailability = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors.array());
    }

    const result = await availabilityService.searchAvailability(req.body);
    return responseHelper.ok(res, {
      therapy: {
        therapyId: result.therapy.TherapyId,
        therapyName: result.therapy.TherapyName,
        cost: result.therapy.Cost,
        duration: result.therapy.Duration,
        description: result.therapy.Description,
      },
      practitioners: result.practitioners,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { searchAvailability };