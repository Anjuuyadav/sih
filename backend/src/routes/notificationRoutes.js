const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const controller = require('../controllers/notificationController');
const validator = require('../validators/notificationValidator');

const router = express.Router();

router.get('/', authMiddleware, validator.history, controller.listNotifications);

module.exports = router;