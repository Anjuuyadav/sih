const express = require('express');
const controller = require('../controllers/patientTherapyController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, authorizeRoles('Patient'), controller.getTherapies);

module.exports = router;