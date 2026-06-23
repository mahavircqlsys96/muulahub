const helper = require('../../helpers/helper');
const { Op, fn, col } = require('sequelize');
const db = require('../../models');
const { users, payments, bookings, withdrawal_requests } = db;

module.exports = {

  get_wallet_balance: async (req, res) => {
    try {
      const user = await users.findOne({
        where: { id: req.auth.id },
        attributes: ['id', 'walletAmount', 'totalEarning', 'pendingAmount', 'withdrawnAmount']
      });

      if (!user) return helper.failed(res, 'User not found');

      return helper.success(res, 'Wallet balance fetched', {
        walletAmount: parseFloat(user.walletAmount) || 0,
        totalEarning: parseFloat(user.totalEarning) || 0,
        pendingAmount: parseFloat(user.pendingAmount) || 0,
        withdrawnAmount: parseFloat(user.withdrawnAmount) || 0
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  get_wallet_history: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await payments.findAndCountAll({
        where: {
          [Op.or]: [
            { userId: req.auth.id }
          ]
        },
        include: [{
          model: bookings,
          as: 'booking',
          where: { providerId: req.auth.id },
          attributes: ['id', 'bookingNumber', 'bookingDate'],
          required: false
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      const allPayments = await payments.findAll({
        include: [{
          model: bookings,
          as: 'booking',
          where: { providerId: req.auth.id },
          attributes: ['id', 'bookingNumber', 'bookingDate'],
          required: true
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return helper.success(res, 'Wallet history fetched', {
        total: allPayments.length,
        page,
        limit,
        data: allPayments
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  get_earnings_summary: async (req, res) => {
    try {
      const providerId = req.auth.id;
      const currentYear = new Date().getFullYear();

      const monthlyEarnings = await payments.findAll({
        attributes: [
          [fn('MONTH', col('payments.createdAt')), 'month'],
          [fn('SUM', col('providerAmount')), 'total']
        ],
        include: [{
          model: bookings,
          as: 'booking',
          where: { providerId },
          attributes: [],
          required: true
        }],
        where: {
          paymentStatus: 'success',
          createdAt: {
            [Op.gte]: new Date(`${currentYear}-01-01`),
            [Op.lte]: new Date(`${currentYear}-12-31 23:59:59`)
          }
        },
        group: [fn('MONTH', col('payments.createdAt'))],
        raw: true
      });

      const monthSeries = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }));
      monthlyEarnings.forEach(r => {
        const m = parseInt(r.month, 10);
        if (m >= 1 && m <= 12) monthSeries[m - 1].total = parseFloat(r.total) || 0;
      });

      const totalCompleted = await bookings.count({ where: { providerId, bookingStatus: 'completed' } });
      const totalPending = await bookings.count({ where: { providerId, bookingStatus: 'pending' } });

      return helper.success(res, 'Earnings summary fetched', {
        monthlyEarnings: monthSeries,
        totalCompleted,
        totalPending
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
