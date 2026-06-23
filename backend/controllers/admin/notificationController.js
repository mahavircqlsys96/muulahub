const db = require('../../models');
const helper = require('../../helpers/helper');
const { Op } = require('sequelize');

module.exports = {
  notificationList: async (req, res) => {
    try {
      const list = await db.notifications.findAll({ order: [['id', 'DESC']], limit: 50 });
      return helper.success(res, "Notifications fetched", list);
    } catch (err) {
      return helper.error(res, "Internal server error");
    }
  },
  sendBulkNotification: async (req, res) => {
    try {
      const { target, title, message, countryId, cityId, categoryId } = req.body;

      if (!title || !message) {
        return helper.failed(res, "Title and message are required");
      }

      let whereClause = {};
      let includeClause = [];

      switch (target) {
        case 'users':
          whereClause.isProvider = 0;
          break;
        case 'providers':
          whereClause.isProvider = 1;
          break;
        case 'country':
          if (!countryId) return helper.failed(res, "Country ID is required for this target");
          // Assuming we need to get country code, or maybe the frontend passes countryId
          const country = await db.countries.findByPk(countryId);
          if (!country) return helper.failed(res, "Country not found");
          // Match by country code if available, or just name
          whereClause[Op.or] = [
            { countryCode: country.code },
            { countryCode: country.name }
          ];
          break;
        case 'city':
          if (!cityId) return helper.failed(res, "City ID is required for this target");
          const city = await db.cities.findByPk(cityId);
          if (!city) return helper.failed(res, "City not found");
          whereClause.city = city.name;
          break;
        case 'category':
          if (!categoryId) return helper.failed(res, "Category ID is required for this target");
          whereClause.isProvider = 1;
          includeClause = [{
            model: db.services,
            as: 'services', // depends on users.hasMany(services) alias
            where: { categoryId: categoryId },
            required: true
          }];
          break;
        case 'all':
        default:
          // no where clause constraints, send to all
          break;
      }

      // We need to verify if users hasMany services alias
      // In associations.js: if (users && services) { users.hasMany(services, { foreignKey: 'providerId', as: 'services' }); }
      // This is safe.

      const usersToNotify = await db.users.findAll({
        where: whereClause,
        include: includeClause,
        attributes: ['id', 'fcmToken']
      });

      if (!usersToNotify || usersToNotify.length === 0) {
        return helper.failed(res, "No users found matching the selected target");
      }

      const notificationsData = usersToNotify.map(u => ({
        userId: u.id,
        senderId: req.user ? req.user.id : 1, // Admin ID
        title: title,
        message: message,
        type: 'system',
        notificationType: 'push',
        isRead: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await db.notifications.bulkCreate(notificationsData);

      // Attempt to send push notifications via Firebase if device token exists
      let pushedCount = 0;
      for (const u of usersToNotify) {
        if (u.deviceToken) {
          try {
            await helper.sendPushNotification({
              token: u.deviceToken,
              title: title,
              body: message,
              type: 'system',
              sender_id: 1,
            });
            pushedCount++;
          } catch (e) {
            console.error("Firebase push failed for user " + u.id);
          }
        }
      }

      return helper.success(res, `Notification sent successfully to ${usersToNotify.length} users (${pushedCount} push delivered)`);

    } catch (err) {
      console.error(err);
      return helper.error(res, "Internal server error");
    }
  }
};
