const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { users, services, bookings, payments, notifications } = db;

module.exports = {

  bookingList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status;
      const paymentStatus = req.query.paymentStatus;
      const userId = req.query.userId;

      const andParts = [];
      if (userId) {
        const uid = parseInt(userId, 10);
        if (!Number.isNaN(uid)) {
          andParts.push({
            [Op.or]: [{ userId: uid }, { providerId: uid }],
          });
        }
      }
      if (status) andParts.push({ bookingStatus: status });
      if (paymentStatus) andParts.push({ paymentStatus: paymentStatus });
      if (search) andParts.push({ bookingNumber: { [Op.like]: `%${search}%` } });

      const whereClause = andParts.length ? { [Op.and]: andParts } : {};

      const { count, rows } = await bookings.findAndCountAll({
        where: whereClause,
        include: [
          { model: users, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
          { model: users, as: 'provider', attributes: ['id', 'name', 'email'] },
          { model: services, as: 'service', attributes: ['id', 'title', 'price'] }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Bookings fetched', {
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

  bookingDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const booking = await bookings.findOne({
        where: { id },
        include: [
          { model: users, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'profileImage'] },
          { model: users, as: 'provider', attributes: ['id', 'name', 'email', 'phone', 'profileImage'] },
          { model: services, as: 'service', attributes: ['id', 'title', 'price', 'serviceImage', 'description'] }
        ]
      });

      if (!booking) return helper.failed(res, 'Booking not found');

      const payment = await payments.findOne({ where: { bookingId: id } });

      return helper.success(res, 'Booking detail fetched', { ...booking.toJSON(), payment });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  updateBookingStatus: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        status: 'required|in:pending,accepted,completed,cancelled'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { id } = req.params;
      const booking = await bookings.findOne({ where: { id } });
      if (!booking) return helper.failed(res, 'Booking not found');

      await booking.update({ bookingStatus: req.body.status });

      return helper.success(res, 'Booking status updated');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  bookingStats: async (req, res) => {
    try {
      const [total, pending, accepted, completed, cancelled] = await Promise.all([
        bookings.count(),
        bookings.count({ where: { bookingStatus: 'pending' } }),
        bookings.count({ where: { bookingStatus: 'accepted' } }),
        bookings.count({ where: { bookingStatus: 'completed' } }),
        bookings.count({ where: { bookingStatus: 'cancelled' } }),
      ]);

      return helper.success(res, 'Booking stats fetched', { total, pending, accepted, completed, cancelled });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
