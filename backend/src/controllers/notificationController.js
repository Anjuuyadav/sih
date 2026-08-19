const repository = require('../repositories/notificationRepository');
const response = require('../utils/responseHelper');
const { NotFoundError } = require('../utils/errors');

const getUserId = (authenticatedUser) => Number(
  authenticatedUser?.UserId
  ?? authenticatedUser?.userId
  ?? authenticatedUser?.id
);

const listNotifications = async (req, res, next) => {
  try {
    const userId = getUserId(req.user);
    if (!Number.isInteger(userId) || userId < 1) {
      throw new NotFoundError('Authenticated user could not be resolved');
    }
    return response.ok(res, {
      notifications: await repository.getNotificationsByUserId(userId),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listNotifications };