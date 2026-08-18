const authService = require('../services/authService');
const { validationResult } = require('express-validator');
const responseHelper = require('../utils/responseHelper');

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors.array());
    }

    await authService.register(req.body);
    return responseHelper.created(res, { message: 'User registered successfully' });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors.array());
    }

    const { token, user } = await authService.login(req.body);
    return responseHelper.ok(res, { token, user });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    return responseHelper.ok(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    return responseHelper.notImplemented(res, { message: 'Refresh token not implemented' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const { id, name, role, email } = req.user;
    return responseHelper.ok(res, { id, name, role, email });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
};
