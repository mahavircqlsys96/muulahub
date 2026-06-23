const envfile = process.env;
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op, fn, col } = require('sequelize');
const db = require('../../models');
const { users, bookings, payments, notifications, services_categories, rating } = db;
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(envfile.stripe_secret_key);

const ADMIN_COMMISSION_PERCENT = parseFloat(process.env.ADMIN_COMMISSION || 15);

const sendBookingNotification = async (userId, senderId, title, message, referenceId) => {
  try {
    const user = await users.findOne({ where: { id: userId } });
    await notifications.create({ userId, senderId, title, message, type: 'booking', referenceId });
    if (user && user.fcmToken) {
      await helper.sendPushNotification({
        token: user.fcmToken,
        title,
        body: message,
        type: 'booking',
        sender_id: senderId,
        request_id: referenceId
      });
    }
  } catch (err) {
    console.log('Notification error:', err.message);
  }
};

module.exports = {

  createBooking: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        providerId: 'required',
        bookingDate: 'required',
        bookingTime: 'required',
        categoryId: 'required',
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { providerId, bookingDate, bookingTime, categoryId } = req.body;
      const userId = req.auth.id;

      const category = await services_categories.findOne({ where: { id: categoryId, status: 1 } });
      if (!category) return helper.failed(res, 'Category not found or not available');

      const bookingNumber = 'BK' + Date.now() + Math.floor(Math.random() * 1000);

      const booking = await bookings.create({
        bookingNumber,
        userId,
        providerId: providerId,
        serviceId: categoryId,
        bookingDate,
        bookingTime,
        paymentStatus: 'pending',
        bookingStatus: 'pending'
      });

      await sendBookingNotification(
        providerId,
        userId,
        'New Booking Request',
        `You have a new booking from ${req.auth.name}`,
        booking.id
      );

      return helper.success(res, 'Booking created successfully', booking);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  payBooking: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        bookingId: 'required',
        paymentMethodId: 'required'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { bookingId, paymentMethodId } = req.body;

      const booking = await bookings.findOne({
        where: { id: bookingId, userId: req.auth.id, paymentStatus: 'pending' }
      });
      if (!booking) return helper.failed(res, 'Booking not found or already paid');

      const user = await users.findOne({ where: { id: req.auth.id } });
      const amountInCents = Math.round(parseFloat(booking.amount) * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        payment_method: paymentMethodId,
        customer: user.customerId || undefined,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
      });

      if (paymentIntent.status === 'succeeded') {
        const adminCommission = parseFloat(((ADMIN_COMMISSION_PERCENT / 100) * parseFloat(booking.amount)).toFixed(2));
        const providerAmount = parseFloat((parseFloat(booking.amount) - adminCommission).toFixed(2));

        await booking.update({ paymentStatus: 'paid' });

        const payment = await payments.create({
          bookingId: booking.id,
          userId: req.auth.id,
          transactionId: paymentIntent.id,
          paymentMethod: 'stripe',
          amount: booking.amount,
          adminCommission,
          providerAmount,
          paymentStatus: 'success'
        });

        await users.increment(
          { walletAmount: providerAmount, totalEarning: providerAmount, pendingAmount: providerAmount },
          { where: { id: booking.providerId } }
        );

        await sendBookingNotification(
          booking.providerId,
          req.auth.id,
          'Payment Received',
          `Payment of $${booking.amount} received for booking #${booking.bookingNumber}`,
          booking.id
        );

        return helper.success(res, 'Payment successful', { booking, payment });
      }

      await booking.update({ paymentStatus: 'failed' });
      return helper.failed(res, 'Payment failed. Please try again.');
    } catch (error) {
      console.log(error);
      return helper.error(res, error.message || 'Payment processing failed');
    }
  },

  getUserBookings: async (req, res) => {
    try {
      const { Op } = db.Sequelize;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { status, type } = req.query;

      let whereClause = {
        userId: req.auth.id
      };

      if (status) {
        whereClause.bookingStatus = status;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (type == 1) {
        whereClause.bookingDate = {
          [Op.gte]: today
        };
      }

      if (type == 2) {
        whereClause.bookingDate = {
          [Op.lt]: today
        };
      }

      const { count, rows } = await bookings.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: services_categories,
            as: 'category',
            attributes: ['id', 'categoryName', 'image']
          },
          {
            model: users,
            as: 'provider',
            attributes: ['id', 'name', 'profileImage']
          }
        ],
        order: [['bookingDate', 'ASC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Bookings fetched', {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        data: rows
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  getProviderBookings: async (req, res) => {
    try {
      const { Op } = db.Sequelize;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const type = req.query.type; // 1,2,3

      const now = new Date();

      let whereClause = {
        providerId: req.auth.id
      };

      // =========================
      // TYPE FILTER LOGIC
      // =========================

      // 1 = UPCOMING (future bookings)
      if (type == 1) {
        whereClause.bookingDate = {
          [Op.gt]: now
        };
      }

      // 2 = ONGOING (today or currently active)
      if (type == 2) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        whereClause.bookingDate = {
          [Op.between]: [startOfDay, endOfDay]
        };

        // optional: refine with status
        whereClause.bookingStatus = {
          [Op.in]: ['accepted', 'in_progress']
        };
      }

      // 3 = PAST (completed/cancelled or past date)
      if (type == 3) {
        whereClause[Op.or] = [
          {
            bookingDate: {
              [Op.lt]: now
            }
          },
          {
            bookingStatus: {
              [Op.in]: ['completed', 'cancelled', 'rejected']
            }
          }
        ];
      }

      // =========================
      // QUERY
      // =========================
      const { count, rows } = await bookings.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: services_categories,
            as: 'category',
            attributes: ['id', 'categoryName', 'image']
          },
          {
            model: users,
            as: 'user',
            attributes: ['id', 'name', 'profileImage', 'phone']
          }
        ],
        order: [['bookingDate', 'ASC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Provider bookings fetched', {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        data: rows
      });

    } catch (error) {
      console.log("getProviderBookings error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

  getBookingDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.id;

      const booking = await bookings.findOne({
        where: {
          id,
          [Op.or]: [{ userId }, { providerId: userId }]
        },
        include: [
          { model: services_categories, as: 'category', attributes: ['id', 'categoryName', 'image'] },
          { model: users, as: 'user', attributes: ['id', 'name', 'profileImage', 'phone', 'email'] },
          { model: users, as: 'provider', attributes: ['id', 'name', 'profileImage', 'phone'] }
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
        bookingId: 'required',
        status: 'required|in:accepted,completed,cancelled,reject'
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { bookingId, status } = req.body;
      const userId = req.auth.id;

      const booking = await bookings.findOne({
        where: { id: bookingId }
      });

      if (!booking) {
        return helper.failed(res, 'Booking not found');
      }

      // =========================
      // OPTIONAL: prevent invalid updates
      // =========================
      if (booking.bookingStatus === 'completed') {
        return helper.failed(res, 'Booking already completed');
      }

      if (booking.bookingStatus === 'cancelled') {
        return helper.failed(res, 'Booking already cancelled');
      }

      // =========================
      // UPDATE STATUS
      // =========================
      await booking.update({
        bookingStatus: status
      });

      // =========================
      // NOTIFICATION LOGIC FIXED
      // =========================
      let notifyUserId;

      if (status === 'cancelled') {
        // whoever is NOT acting user
        notifyUserId = booking.providerId === userId
          ? booking.userId
          : booking.providerId;
      } else {
        // accepted / completed / rejected → notify customer by default
        notifyUserId = booking.userId;
      }

      // =========================
      // MESSAGE
      // =========================
      let notifyMsg = '';

      switch (status) {
        case 'accepted':
          notifyMsg = 'Your booking has been accepted';
          break;
        case 'completed':
          notifyMsg = 'Your booking has been marked as completed';
          break;
        case 'cancelled':
          notifyMsg = 'Your booking has been cancelled';
          break;
        case 'rejected':
          notifyMsg = 'Your booking has been rejected';
          break;
      }

      // =========================
      // SEND NOTIFICATION
      // =========================
      await sendBookingNotification(
        notifyUserId,
        userId,
        'Booking Update',
        notifyMsg,
        bookingId
      );

      return helper.success(res, `Booking ${status} successfully`);

    } catch (error) {
      console.log("updateBookingStatus error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },
  giveRating: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        bookingId: 'required',
        ratingCount: 'required',
        review: 'required'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { bookingId, ratingCount, review, image } = req.body;
      const userId = req.auth.id;

      const booking = await bookings.findOne({ where: { id: bookingId, userId: userId } });
      if (!booking) return helper.failed(res, 'Booking not found');

      if (booking.bookingStatus !== 'completed') {
        return helper.failed(res, 'Booking must be completed to give a rating');
      }

      const ratingData = await rating.create({
        bookingId,
        userId,
        providerId: booking.providerId,
        rating: ratingCount,
        review,
        image
      });

      return helper.success(res, 'Rating given successfully', ratingData);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },
  providerRatingList: async (req, res) => {
    try {
      const { providerId } = req.query;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // =========================
      // REVIEWS LIST (PAGINATION)
      // =========================
      const ratingData = await rating.findAll({
        where: { providerId },
        include: [
          {
            model: users,
            as: 'user',
            attributes: ['id', 'name', 'profileImage']
          },
          {
            model: bookings,
            as: 'booking',
            attributes: ['id', 'bookingDate']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      // =========================
      // TOTAL COUNT
      // =========================
      const total = await rating.count({
        where: { providerId }
      });

      // =========================
      // STAR WISE COUNT (1-5)
      // =========================
      const starCounts = await rating.findAll({
        where: { providerId },
        attributes: [
          'rating',
          [db.sequelize.fn('COUNT', db.sequelize.col('rating')), 'count']
        ],
        group: ['rating']
      });

      // Format star breakdown
      let ratingBreakdown = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      };

      starCounts.forEach(item => {
        ratingBreakdown[item.rating] = parseInt(item.dataValues.count);
      });

      // =========================
      // AVERAGE RATING
      // =========================
      const avgData = await rating.findOne({
        where: { providerId },
        attributes: [
          [db.sequelize.fn('AVG', db.sequelize.col('rating')), 'avgRating']
        ],
        raw: true
      });

      const avgRating = parseFloat(avgData?.avgRating || 0).toFixed(1);

      // =========================
      // RESPONSE
      // =========================
      return helper.success(res, 'Rating list fetched successfully', {

        totalReviews: total,
        averageRating: avgRating,
        ratingBreakdown,
        reviews: ratingData,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        },
      });

    } catch (error) {
      console.log("providerRatingList error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

};
