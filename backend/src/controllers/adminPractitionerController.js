const { validationResult } = require('express-validator');
const adminDoctorService = require('../services/adminPractiotionerService');
const responseHelper = require('../utils/responseHelper');

const createDoctor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors.array());
    }

    await adminDoctorService.createDoctor(req.body);
    return responseHelper.created(res, { message: 'Doctor created successfully' });
  } catch (error) {
    next(error);
  }
};

const getDoctors = async (req, res, next) => {
  try {
    const doctors = await adminDoctorService.getDoctors();
    return responseHelper.ok(res, { doctors });
  } catch (error) {
    next(error);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await adminDoctorService.getDoctorById(req.params.id);
    return responseHelper.ok(res, { doctor });
  } catch (error) {
    next(error);
  }
};

const updateDoctor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors.array());
    }

    const doctor = await adminDoctorService.updateDoctor(req.params.id, req.body);
    return responseHelper.ok(res, { message: 'Doctor updated successfully', doctor });
  } catch (error) {
    next(error);
  }
};

const deleteDoctor = async (req, res, next) => {
  try {
    await adminDoctorService.deleteDoctor(req.params.id);
    return responseHelper.ok(res, { message: 'Doctor deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
