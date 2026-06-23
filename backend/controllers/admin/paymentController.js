const db = require('../../models');
const { Op, fn, col } = require('sequelize');
const helper = require('../../helpers/helper');
const { users, bookings, payments } = db;

module.exports = {

  paymentList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status;

      let whereClause = {};
      if (status) whereClause.paymentStatus = status;
      if (search) whereClause.transactionId = { [Op.like]: `%${search}%` };

      const { count, rows } = await payments.findAndCountAll({
        where: whereClause,
        include: [
          { model: users, as: 'payer', attributes: ['id', 'name', 'email'] },
          {
            model: bookings,
            as: 'booking',
            attributes: ['id', 'bookingNumber', 'bookingDate', 'providerId'],
            include: [{ model: users, as: 'provider', attributes: ['id', 'name'] }]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Payments fetched', {
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

  paymentStats: async (req, res) => {
    try {
      const totalRevenue = await payments.findOne({
        attributes: [[fn('COALESCE', fn('SUM', col('adminCommission')), 0), 'total']],
        where: { paymentStatus: 'success' },
        raw: true
      });

      const totalPayout = await payments.findOne({
        attributes: [[fn('COALESCE', fn('SUM', col('providerAmount')), 0), 'total']],
        where: { paymentStatus: 'success' },
        raw: true
      });

      const totalTransactions = await payments.findOne({
        attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
        where: { paymentStatus: 'success' },
        raw: true
      });

      return helper.success(res, 'Payment stats fetched', {
        adminRevenue: parseFloat(totalRevenue?.total || 0),
        providerPayout: parseFloat(totalPayout?.total || 0),
        totalVolume: parseFloat(totalTransactions?.total || 0),
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  paymentDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const payment = await payments.findOne({
        where: { id },
        include: [
          { model: users, as: 'payer', attributes: ['id', 'name', 'email', 'phone'] },
          {
            model: bookings,
            as: 'booking',
            include: [
              { model: users, as: 'provider', attributes: ['id', 'name', 'email'] },
              { model: db.services, as: 'service', attributes: ['id', 'title'] }
            ]
          }
        ]
      });

      if (!payment) return helper.failed(res, 'Payment not found');
      return helper.success(res, 'Payment detail fetched', payment);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
