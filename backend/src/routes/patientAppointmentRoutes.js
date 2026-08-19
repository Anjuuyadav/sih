const express = require('express');
const controller = require('../controllers/patientAppointmentController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get(
  '/appointments',
  authMiddleware,
  authorizeRoles('Patient'),
  controller.getAppointments
);

module.exports = router;