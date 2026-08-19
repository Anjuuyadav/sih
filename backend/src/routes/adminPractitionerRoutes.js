const express = require('express');
const router = express.Router();
const adminPractitionerController = require('../controllers/adminPractitionerController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const PractitionerValidator = require('../validators/PractitionerValidator');


router.post('/', authMiddleware, authorizeRoles('Admin'), PractitionerValidator.createPractitioner, adminPractitionerController.createPractitioner);


router.get('/', authMiddleware, authorizeRoles('Admin'), adminPractitionerController.getPractitioners);


router.get('/:id', authMiddleware, authorizeRoles('Admin'), adminPractitionerController.getPractitionerById);


router.put('/:id', authMiddleware, authorizeRoles('Admin'), PractitionerValidator.updatePractitioner, adminPractitionerController.updatePractitioner);


router.delete('/:id', authMiddleware, authorizeRoles('Admin'), adminPractitionerController.deletePractitioner);

module.exports = router;
