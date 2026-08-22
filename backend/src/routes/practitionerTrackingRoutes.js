const express = require('express');
const controller = require('../controllers/practitionerTrackingController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validator = require('../validators/practitionerTrackingValidator');

const router = express.Router();
const practitionerOnly = [authMiddleware, authorizeRoles('Practitioner')];

router.get('/therapy-tracking/patients', ...practitionerOnly, controller.listPatients);
router.get('/therapy-tracking/patients/:patientId', ...practitionerOnly, validator.patientId, controller.getPatientDetails);
router.patch('/therapy-tracking/sessions/:sessionId/complete', ...practitionerOnly, validator.sessionId, controller.completeSession);

module.exports = router;
