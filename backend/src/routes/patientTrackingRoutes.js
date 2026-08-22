const express = require('express');
const controller = require('../controllers/patientTrackingController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/therapy-tracking', authMiddleware, authorizeRoles('Patient'), controller.getTherapyTracking);

module.exports = router;
