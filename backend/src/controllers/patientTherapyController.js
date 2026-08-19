const service = require('../services/patientTherapyService');
const response = require('../utils/responseHelper');

const getTherapies = async (req, res, next) => {
  try {
    return response.ok(res, {
      success: true,
      data: await service.getActiveTherapies(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTherapies };