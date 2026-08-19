const repository = require('../repositories/patientTherapyRepository');

const getActiveTherapies = async () => {
  const therapies = await repository.getActiveTherapies();
  return therapies
    .map((therapy) => ({
      therapyId: therapy.TherapyId,
      therapyName: therapy.TherapyName,
      cost: therapy.Cost,
      duration: therapy.Duration,
      description: therapy.Description,
    }))
    .sort((first, second) => first.therapyName.localeCompare(second.therapyName));
};

module.exports = { getActiveTherapies };