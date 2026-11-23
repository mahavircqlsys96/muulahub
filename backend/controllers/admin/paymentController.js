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
          { model: users, as: 'payer', attributes: ['id', 'name', 'email', 'currency'] },
          {
            model: bookings,
            as: 'booking',
            attributes: ['id', 'bookingNumber', 'bookingDate', 'providerId', 'currency'],
            include: [{ model: users, as: 'provider', attributes: ['id', 'name', 'currency'] }]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      const formattedRows = rows.map(p => {
        const item = p.toJSON ? p.toJSON() : p;
        const resolvedCurrency = (item.booking && item.booking.currency && String(item.booking.currency).trim() !== '' && item.booking.currency !== 'null')
          ? String(item.booking.currency).toLowerCase().trim()
          : ((item.payer && item.payer.currency && String(item.payer.currency).trim() !== '' && item.payer.currency !== 'null')
            ? String(item.payer.currency).toLowerCase().trim()
            : ((item.booking && item.booking.provider && item.booking.provider.currency)
              ? String(item.booking.provider.currency).toLowerCase().trim()
              : 'usd'));
        item.currency = resolvedCurrency;
        return item;
      });

      return helper.success(res, 'Payments fetched', {
        list: formattedRows,
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

      const latestPayment = await payments.findOne({
        where: { paymentStatus: 'success' },
        include: [
          { model: bookings, as: 'booking', attributes: ['currency'] },
          { model: users, as: 'payer', attributes: ['currency'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      let primaryCurrency = 'usd';
      if (latestPayment) {
        if (latestPayment.booking && latestPayment.booking.currency && String(latestPayment.booking.currency).trim() !== '' && latestPayment.booking.currency !== 'null') {
          primaryCurrency = String(latestPayment.booking.currency).toLowerCase().trim();
        } else if (latestPayment.payer && latestPayment.payer.currency && String(latestPayment.payer.currency).trim() !== '' && latestPayment.payer.currency !== 'null') {
          primaryCurrency = String(latestPayment.payer.currency).toLowerCase().trim();
        }
      }

      return helper.success(res, 'Payment stats fetched', {
        adminRevenue: parseFloat(totalRevenue?.total || 0),
        providerPayout: parseFloat(totalPayout?.total || 0),
        totalVolume: parseFloat(totalTransactions?.total || 0),
        primaryCurrency
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
          { model: users, as: 'payer', attributes: ['id', 'name', 'email', 'phone', 'currency'] },
          {
            model: bookings,
            as: 'booking',
            attributes: ['id', 'bookingNumber', 'bookingDate', 'providerId', 'currency'],
            include: [
              { model: users, as: 'provider', attributes: ['id', 'name', 'email', 'currency'] },
              { model: db.services, as: 'service', attributes: ['id', 'title'] }
            ]
          }
        ]
      });

      if (!payment) return helper.failed(res, 'Payment not found');
      const item = payment.toJSON ? payment.toJSON() : payment;
      const resolvedCurrency = (item.booking && item.booking.currency && String(item.booking.currency).trim() !== '' && item.booking.currency !== 'null')
        ? String(item.booking.currency).toLowerCase().trim()
        : ((item.payer && item.payer.currency && String(item.payer.currency).trim() !== '' && item.payer.currency !== 'null')
          ? String(item.payer.currency).toLowerCase().trim()
          : ((item.booking && item.booking.provider && item.booking.provider.currency)
            ? String(item.booking.provider.currency).toLowerCase().trim()
            : 'usd'));
      item.currency = resolvedCurrency;

      return helper.success(res, 'Payment detail fetched', item);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
