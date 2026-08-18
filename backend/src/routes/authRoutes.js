const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const authValidator = require('../validators/authValidator');


router.post('/register', authValidator.register, authController.register);

router.post('/login', authValidator.login, authController.login);

router.post('/logout', authMiddleware, authController.logout);


router.post('/refresh-token', authController.refreshToken);


router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
