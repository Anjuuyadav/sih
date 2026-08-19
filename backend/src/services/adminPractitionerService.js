const repository = require('../repositories/practitonerRepository');
const { NotFoundError, ConflictError } = require('../utils/errors');

const createPractitioner = async (data) => { try { return await repository.createPractitioner({ ...data, role: 'Practitioner' }); } catch (error) { if (error.number === 2627 || error.number === 2601) throw new ConflictError('Email already exists'); throw error; } };
const getPractitioners = () => repository.getPractitioners();
const getPractitionerById = async (id) => {
  const practitioner = await repository.getPractitionerById(id);
  if (!practitioner) throw new NotFoundError('Practitioner not found');
  return practitioner;
};
const updatePractitioner = async (id, data) => {
  await getPractitionerById(id);
  try { return await repository.updatePractitioner(id, { ...data, role: 'Practitioner' }); } catch (error) {
    if (error.number === 2627 || error.number === 2601) throw new ConflictError('Email already exists');
    throw error;
  }
};
const deletePractitioner = async (id) => {
  await getPractitionerById(id);
  return repository.softDeletePractitioner(id);
};
const getAvailability = async (id) => { await getPractitionerById(id); return repository.getAvailability(id); };
module.exports = { createPractitioner, getPractitioners, getPractitionerById, updatePractitioner, deletePractitioner, getAvailability };
