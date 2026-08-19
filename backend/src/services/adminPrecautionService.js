const precautionRepository = require('../repositories/precautionRepository');
const therapyRepository = require('../repositories/therapyRepository');
const { NotFoundError } = require('../utils/errors');

const createPrecaution = async (therapyId, data) => {
  const therapy = await therapyRepository.getTherapyById(therapyId);
  if (!therapy) {
    throw new NotFoundError('Therapy not found');
  }
  return precautionRepository.createPrecaution(therapyId, {
    precautionType: data.precautionType || data.PrecautionType,
    precautionText: data.precautionText || data.PrecautionText,
  });
};

const getPrecautions = async (therapyId) => {
  const therapy = await therapyRepository.getTherapyById(therapyId);
  if (!therapy) {
    throw new NotFoundError('Therapy not found');
  }
  return precautionRepository.getPrecautions(therapyId);
};

const updatePrecaution = async (precautionId, data) => {
  const precaution = await precautionRepository.getPrecautionById(precautionId);
  if (!precaution) {
    throw new NotFoundError('Precaution not found');
  }
  return precautionRepository.updatePrecaution(precautionId, {
    precautionType: data.precautionType || data.PrecautionType,
    precautionText: data.precautionText || data.PrecautionText,
  });
};

const deletePrecaution = async (precautionId) => {
  const precaution = await precautionRepository.getPrecautionById(precautionId);
  if (!precaution) {
    throw new NotFoundError('Precaution not found');
  }
  return precautionRepository.deletePrecaution(precautionId);
};

module.exports = {
  createPrecaution,
  getPrecautions,
  updatePrecaution,
  deletePrecaution,
};
