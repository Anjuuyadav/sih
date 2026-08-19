const service = require('../services/patientAppointmentService');
const response = require('../utils/responseHelper');

const getAppointments = async (req, res, next) => {
  try {
    return response.ok(res, {
      success: true,
      data: await service.getAppointments(req.user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAppointments };