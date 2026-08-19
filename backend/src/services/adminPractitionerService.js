const bcrypt = require('bcrypt');
const doctorRepository = require('../repositories/doctorRepository');
const userRepository = require('../repositories/userRepository');
const { ConflictError, NotFoundError, BadRequestError } = require('../utils/errors');

const createPractitioner = async (data) => {
  const { name, email, phone, password, specialization, qualification, experienceYears, dailyPatientLimit, startTime, endTime } = data;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const existingUserByEmail = await userRepository.getUserByEmail(normalizedEmail);
  if (existingUserByEmail) {
    throw new ConflictError('Email already exists');
  }

  const existingUserByPhone = await userRepository.getUserByPhone(phone);
  if (existingUserByPhone) {
    throw new ConflictError('Phone already exists');
  }

  const passwordHash = await bcrypt.hash(String(password || ''), 12);

  await doctorRepository.createPractitionerWithUser({
    name,
    email: normalizedEmail,
    phone,
    passwordHash,
    specialization,
    qualification,
    experienceYears,
    dailyPatientLimit,
    startTime,
    endTime,
  });
};

const getDoctors = async () => {
  return doctorRepository.getDoctors();
};

const getDoctorById = async (id) => {
  const doctor = await doctorRepository.getDoctorById(id);
  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }
  return doctor;
};

const updateDoctor = async (id, data) => {
  const existingDoctor = await doctorRepository.getDoctorById(id);
  if (!existingDoctor) {
    throw new NotFoundError('Doctor not found');
  }

  const payload = { ...data };
  if (payload.password) {
    payload.password = await bcrypt.hash(String(payload.password), 12);
  }

  const normalizedEmail = payload.email ? String(payload.email).trim().toLowerCase() : existingDoctor.Email;
  if (payload.email && normalizedEmail !== existingDoctor.Email) {
    const emailUser = await userRepository.getUserByEmail(normalizedEmail);
    if (emailUser && emailUser.UserId !== existingDoctor.UserId) {
      throw new ConflictError('Email already exists');
    }
  }

  if (payload.phone && payload.phone !== existingDoctor.Phone) {
    const phoneUser = await userRepository.getUserByPhone(payload.phone);
    if (phoneUser && phoneUser.UserId !== existingDoctor.UserId) {
      throw new ConflictError('Phone already exists');
    }
  }

  return doctorRepository.updateDoctor(id, { ...payload, email: normalizedEmail });
};

const deleteDoctor = async (id) => {
  const doctor = await doctorRepository.getDoctorById(id);
  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }

  await doctorRepository.softDeleteDoctor(id);
};

module.exports = {
  createPractitioner,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
