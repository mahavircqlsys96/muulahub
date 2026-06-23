const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { services, users, services_categories } = db;

module.exports = {

  serviceList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status;

      let whereClause = {};
      if (status) whereClause.status = status;
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await services.findAndCountAll({
        where: whereClause,
        include: [
          { model: users, as: 'provider', attributes: ['id', 'name', 'email', 'profileImage'] },
          { model: services_categories, as: 'category', attributes: ['id', 'categoryName'] }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Services fetched', {
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

  updateServiceStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return helper.failed(res, 'Invalid status');
      }

      const service = await services.findOne({ where: { id } });
      if (!service) return helper.failed(res, 'Service not found');

      await service.update({ status });

      if (db.notifications) {
        await db.notifications.create({
          userId: service.providerId,
          title: 'Service Status Update',
          message: `Your service "${service.title}" has been ${status}.`,
          type: 'system'
        });
      }

      return helper.success(res, 'Service status updated');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
