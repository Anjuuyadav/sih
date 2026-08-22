const { validationResult } = require('express-validator');
const service = require('../services/practitionerTrackingService');
const response = require('../utils/responseHelper');

const validate = (req, res) => {
  const errors = validationResult(req);
  return errors.isEmpty() || response.validationError(res, errors.array());
};

const listPatients = async (req, res, next) => {
  try {
    return response.ok(res, {
      success: true,
      data: await service.listTrackedPatients(req.user),
    });
  } catch (error) {
    next(error);
  }
};

const getPatientDetails = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;
    return response.ok(res, {
      success: true,
      data: await service.getPatientTrackingDetails(Number(req.params.patientId), req.user),
    });
  } catch (error) {
    next(error);
  }
};

const completeSession = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;
    const result = await service.markSessionCompleted(Number(req.params.sessionId), req.user);
    return response.ok(res, {
      success: true,
      message: 'Session marked as completed successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPatients,
  getPatientDetails,
  completeSession,
};
