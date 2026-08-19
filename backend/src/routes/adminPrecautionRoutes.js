const express = require('express');
const router = express.Router();
const adminPrecautionController = require('../controllers/adminPrecautionsController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const { body, param } = require('express-validator');
const precautionValidator = [param('precautionId').isInt(), body('precautionType').isIn(['PRE', 'POST']).withMessage('Type must be PRE or POST'), body('precautionText').trim().isLength({ min: 1, max: 500 }).withMessage('Precaution text is required')];


router.put('/:precautionId', authMiddleware, authorizeRoles('Admin'), precautionValidator, adminPrecautionController.updatePrecaution);

router.delete('/:precautionId', authMiddleware, authorizeRoles('Admin'), adminPrecautionController.deletePrecaution);

module.exports = router;
