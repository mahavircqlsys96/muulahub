const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');

module.exports = {
  contactUs_list: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const userType = req.query.user_type || req.query.userType || '';
      const offset = (page - 1) * limit;

      let whereClause = {};
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { message: { [Op.like]: `%${search}%` } },
        ];
      }

      let userInclude = {
        model: db.users,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role', 'phone'],
        required: false,
        paranoid: false,
      };

      if (userType) {
        userInclude.where = { role: userType };
        userInclude.required = true;
      }

      const { count, rows } = db.contact_support
        ? await db.contact_support.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['createdAt', 'DESC']],
            include: [userInclude],
            distinct: true,
          })
        : { count: 0, rows: [] };

      return helper.success(res, 'Contact list fetched', {
        contactUs_list: rows,
        list: rows,
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  view_contactUs: async (req, res) => {
    try {
      const { id } = req.params;
      if (!db.contact_support) return helper.success(res, 'Not found', {});
      const item = await db.contact_support.findOne({
        where: { id },
        include: [{
          model: db.users,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role', 'phone'],
          required: false,
          paranoid: false
        }],
      });
      if (!item) return helper.failed(res, 'Not found');
      return helper.success(res, 'Fetched', item);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  update_contactUs: async (req, res) => {
    try {
      const { id } = req.params;
      if (!db.contact_support) return helper.success(res, 'OK');
      await db.contact_support.update(req.body, { where: { id } });
      return helper.success(res, 'Updated');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  delete_contactUs: async (req, res) => {
    try {
      const { id } = req.params;
      if (!db.contact_support) return helper.success(res, 'OK');
      await db.contact_support.destroy({ where: { id } });
      return helper.success(res, 'Deleted');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },
};
