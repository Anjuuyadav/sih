const service = require('../services/patientTrackingService');
const response = require('../utils/responseHelper');

const getTherapyTracking = async (req, res, next) => {
  try {
    return response.ok(res, {
      success: true,
      data: await service.getTherapyTracking(req.user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTherapyTracking,
};
