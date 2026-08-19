const { validationResult } = require('express-validator');
const service = require('../services/adminPrecautionService');
const response = require('../utils/responseHelper');

const validate = (req, res) => {
  const errors = validationResult(req);
  return errors.isEmpty() || response.validationError(res, errors.array());
};

const createPrecaution = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;
    return response.created(res, { precaution: await service.createPrecaution(req.params.therapyId, req.body) });
  } catch (error) { next(error); }
};

const getPrecautions = async (req, res, next) => {
  try { return response.ok(res, { precautions: await service.getPrecautions(req.params.therapyId) }); }
  catch (error) { next(error); }
};

const updatePrecaution = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;
    return response.ok(res, { precaution: await service.updatePrecaution(req.params.precautionId, req.body) });
  } catch (error) { next(error); }
};

const deletePrecaution = async (req, res, next) => {
  try {
    await service.deletePrecaution(req.params.precautionId);
    return response.ok(res, { message: 'Precaution deleted successfully' });
  } catch (error) { next(error); }
};

module.exports = { createPrecaution, getPrecautions, updatePrecaution, deletePrecaution };
