const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { promo_codes } = db;

module.exports = {
  listPromos: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const offset = (page - 1) * limit;

      let whereClause = {};
      if (search) {
        whereClause.code = { [Op.like]: `%${search}%` };
      }

      const { count, rows } = await promo_codes.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return helper.success(res, 'Promo codes fetched', {
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

  createPromo: async (req, res) => {
    try {
      const { code, discountType, discountValue, maxUses, expiresAt } = req.body;
      
      if (!code || !discountType || !discountValue) {
        return helper.failed(res, 'Missing required fields');
      }

      const exists = await promo_codes.findOne({ where: { code } });
      if (exists) {
        return helper.failed(res, 'Promo code already exists');
      }

      await promo_codes.create({
        code,
        discountType,
        discountValue,
        maxUses: maxUses || null,
        expiresAt: expiresAt || null
      });

      return helper.success(res, 'Promo code created');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  togglePromoStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const promo = await promo_codes.findOne({ where: { id } });
      if (!promo) return helper.failed(res, 'Promo code not found');

      const status = promo.status === 'active' ? 'inactive' : 'active';
      await promo.update({ status });

      return helper.success(res, 'Promo status toggled');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  deletePromo: async (req, res) => {
    try {
      const { id } = req.params;
      const promo = await promo_codes.findOne({ where: { id } });
      if (!promo) return helper.failed(res, 'Promo code not found');

      await promo.destroy();
      return helper.success(res, 'Promo code deleted');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
