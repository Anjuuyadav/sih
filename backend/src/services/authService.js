const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');
const { generateToken } = require('../utils/jwtHelper');
const { BadRequestError, ConflictError, UnauthorizedError } = require('../utils/errors');

const EMAIL_ALREADY_EXISTS = 'Email already exists';
const INVALID_CREDENTIALS = 'Invalid email or password';
const USER_INACTIVE = 'User account is inactive';

const register = async (data) => {
  const { name, email, password, registrationDate } = data;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const existingByEmail = await userRepository.getUserByEmail(normalizedEmail);
  if (existingByEmail) {
    throw new ConflictError(EMAIL_ALREADY_EXISTS);
  }

  const passwordHash = await bcrypt.hash(String(password || ''), 12);

  const userPayload = {
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'Patient',
    status: 'Active',
  };

  await userRepository.createUser(userPayload);
  // const createdUser = await userRepository.createUser(userPayload);

  // await userRepository.createUser({
  //   userId: createdUser.UserId,
  //   registrationDate: registrationDate || new Date(),
  // });
};

const login = async ({ email, password }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await userRepository.getUserByEmail(normalizedEmail);
  if (!user) {
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  const passwordMatches = await bcrypt.compare(String(password || ''), user.PasswordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  if (user.Status !== 'Active') {
    throw new UnauthorizedError(USER_INACTIVE);
  }

  const tokenPayload = {
    id: user.UserId,
    name: user.Name,
    role: user.Role,
    email: user.Email,
  };

  const token = generateToken(tokenPayload);

  return {
    token,
    user: tokenPayload,
  };
};

module.exports = {
  register,
  login,
};
