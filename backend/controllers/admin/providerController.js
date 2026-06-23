const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { users, services, provider_verifications, bookings, payments, notifications, provider_categories, services_categories, portfolio_images } = db;

module.exports = {

  providerList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status;

      let whereClause = { isProvider: 1 };
      if (status) whereClause.providerStatus = status;

      if (search) {
        whereClause[Op.and] = [
          { isProvider: 1 },
          {
            [Op.or]: [
              { name: { [Op.like]: `%${search}%` } },
              { email: { [Op.like]: `%${search}%` } },
              { phone: { [Op.like]: `%${search}%` } }
            ]
          }
        ];
        delete whereClause.isProvider;
      }

      const { count, rows } = await users.findAndCountAll({
        where: whereClause,
        attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] },
        include: [{
          model: services,
          as: 'service',
          attributes: ['id', 'title', 'categoryId', 'price', 'status'],
          required: false
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Providers fetched', {
        list: rows,
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  viewProvider: async (req, res) => {
    try {
      const { id } = req.params;

      const provider = await users.findOne({
        where: { id, isProvider: 1 },
        attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] },
        include: [
          {
            model: provider_categories,
            as: 'providerCategories',
            include: [{ model: services_categories, as: 'category' }]
          },
          {
            model: portfolio_images,
            as: 'portfolio_images'
          }
        ]
      });

      if (!provider) return helper.failed(res, 'Provider not found');

      const [service, verifications, completedJobs, totalEarnings] = await Promise.all([
        services.findOne({
          where: { providerId: id },
          include: [{ model: db.services_categories, as: 'category', attributes: ['id', 'categoryName'] }]
        }),
        provider_verifications.findAll({ where: { providerId: id }, order: [['createdAt', 'DESC']] }),
        bookings.count({ where: { providerId: id, bookingStatus: 'completed' } }),
        payments.findOne({
          attributes: [[db.sequelize.fn('SUM', db.sequelize.col('providerAmount')), 'total']],
          include: [{
            model: bookings,
            as: 'booking',
            where: { providerId: id },
            attributes: [],
            required: true
          }],
          where: { paymentStatus: 'success' },
          raw: true
        })
      ]);

      return helper.success(res, 'Provider detail fetched', {
        ...provider.toJSON(),
        service,
        verifications,
        completedJobs,
        totalEarnings: parseFloat(totalEarnings?.total || 0)
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  updateProviderStatus: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        providerId: 'required',
        status: 'required|in:approved,rejected,pending'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { providerId, status, remarks } = req.body;

      const provider = await users.findOne({ where: { id: providerId, isProvider: 1 } });
      if (!provider) return helper.failed(res, 'Provider not found');

      await users.update({ providerStatus: status }, { where: { id: providerId } });

      if (provider_verifications) {
        await provider_verifications.update(
          { verificationStatus: status, remarks: remarks || null },
          { where: { providerId } }
        );
      }

      await notifications.create({
        userId: providerId,
        title: 'Provider Status Update',
        message: status === 'approved'
          ? 'Congratulations! Your provider account has been approved.'
          : `Your provider account has been ${status}. ${remarks || ''}`,
        type: 'system'
      });

      const providerUser = await users.findOne({ where: { id: providerId } });
      if (providerUser && providerUser.fcmToken) {
        await helper.sendPushNotification({
          token: providerUser.fcmToken,
          title: 'Provider Status Update',
          body: status === 'approved' ? 'Your provider account is approved!' : `Account ${status}`,
          type: 'system',
          sender_id: req.auth.id
        });
      }

      return helper.success(res, `Provider status updated to ${status}`);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  pendingVerifications: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await provider_verifications.findAndCountAll({
        where: { verificationStatus: 'pending' },
        include: [{
          model: users,
          as: 'provider',
          attributes: ['id', 'name', 'email', 'phone', 'profileImage']
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Pending verifications fetched', {
        list: rows,
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  updateProviderAvatar: async (req, res) => {
    try {
      const { id } = req.params;
      const provider = await users.findOne({ where: { id, isProvider: 1 } });
      if (!provider) return helper.failed(res, 'Provider not found');
      if (!req.files || !req.files.profileImage) {
        return helper.failed(res, 'profileImage file is required');
      }
      const profileImage = await helper.fileUpload(req.files.profileImage, 'users');
      await provider.update({ profileImage });
      return helper.success(res, 'Profile image updated', { profileImage });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  updateProviderCategories: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { id } = req.params;
      const { categoryIds } = req.body; // Expecting array of category IDs

      const provider = await users.findOne({ where: { id, isProvider: 1 } });
      if (!provider) return helper.failed(res, 'Provider not found');

      if (!Array.isArray(categoryIds)) {
        return helper.failed(res, 'categoryIds must be an array');
      }

      // Delete existing categories
      await provider_categories.destroy({ where: { providerId: id }, transaction: t });

      // Insert new categories
      const categoriesData = categoryIds.map(categoryId => ({
        providerId: id,
        categoryId
      }));

      if (categoriesData.length > 0) {
        await provider_categories.bulkCreate(categoriesData, { transaction: t });
      }

      await t.commit();
      return helper.success(res, 'Provider categories updated successfully');
    } catch (error) {
      await t.rollback();
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
