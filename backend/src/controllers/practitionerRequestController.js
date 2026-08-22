const { validationResult } = require('express-validator');
const service = require('../services/practitionerRequestService');
const response = require('../utils/responseHelper');

const validate = (req, res) => {
  const errors = validationResult(req);
  return errors.isEmpty() || response.validationError(res, errors.array());
};

const listRequests = async (req, res, next) => {
  try {
    return response.ok(res, { requests: await service.listRequests(req.user) });
  } catch (error) {
    next(error);
  }
};

const getRequestDetails = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;
    return response.ok(res, {
      request: await service.getRequestDetails(Number(req.params.therapyPlanId), req.user),
    });
  } catch (error) {
    next(error);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;
    const result = await service.acceptRequest(Number(req.params.therapyPlanId), req.user);
    return response.ok(res, {
      success: true,
      message: 'Session request accepted successfully.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const rejectRequest = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;
    const result = await service.rejectRequest(
      Number(req.params.therapyPlanId),
      req.body.rejectionReason,
      req.user
    );
    return response.ok(res, {
      success: true,
      message: 'Session request rejected successfully.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listRequests,
  getRequestDetails,
  acceptRequest,
  rejectRequest,
};