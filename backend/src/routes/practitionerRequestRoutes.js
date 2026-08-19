const express = require('express');
const controller = require('../controllers/practitionerRequestController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validator = require('../validators/practitionerRequestValidator');

const router = express.Router();
const practitionerOnly = [authMiddleware, authorizeRoles('Practitioner')];

router.get('/session-requests', ...practitionerOnly, controller.listRequests);
router.get(
  '/session-requests/:therapyPlanId',
  ...practitionerOnly,
  validator.therapyPlanId,
  controller.getRequestDetails
);
router.post(
  '/session-requests/:therapyPlanId/accept',
  ...practitionerOnly,
  validator.acceptRequest,
  controller.acceptRequest
);
router.post(
  '/session-requests/:therapyPlanId/reject',
  ...practitionerOnly,
  validator.rejectRequest,
  controller.rejectRequest
);

module.exports = router;