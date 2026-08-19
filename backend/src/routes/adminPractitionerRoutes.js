const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminPractitionerController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validator = require('../validators/PractitionerValidator');
const { param } = require('express-validator');
const adminOnly = [authMiddleware, authorizeRoles('Admin')];
const practitionerId = param('id').isInt().withMessage('Practitioner id must be an integer');

router.get('/', ...adminOnly, controller.getPractitioners);
router.post('/', ...adminOnly, validator.createPractitioner, controller.createPractitioner);
router.get('/:id', ...adminOnly, practitionerId, controller.getPractitionerById);
router.get('/:id/availability', ...adminOnly, practitionerId, controller.getAvailability);
router.put('/:id', ...adminOnly, validator.updatePractitioner, controller.updatePractitioner);
router.delete('/:id', ...adminOnly, practitionerId, controller.deletePractitioner);
module.exports = router;
