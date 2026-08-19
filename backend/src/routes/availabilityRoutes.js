const express = require('express');
const availabilityController = require('../controllers/availabilityController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const availabilityValidator = require('../validators/availabilityValidator');

const router = express.Router();

router.post(
  '/search',
  authMiddleware,
  authorizeRoles('Patient'),
  availabilityValidator.searchAvailability,
  availabilityController.searchAvailability
);

module.exports = router;