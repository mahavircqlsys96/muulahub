const envfile = process.env;
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op, fn, col } = require('sequelize');
const db = require('../../models');
const { users, bookings, payments, notifications, services_categories, rating, booking_images, wallet_transactions } = db;
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

  createBookingOld: async (req, res) => {
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
  createBooking: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        providerId: 'required',
        bookingDate: 'required',
        bookingTime: 'required',
        categoryId: 'required',
        // location: 'required',
        // latitude: 'required',
        // longitude: 'required',
        // bookingType : 'required|in:onSite,offSite',
        // amount: 'required',

      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      let { amount, bookingType, providerId, bookingDate, bookingTime, categoryId, location, latitude, longitude, images, video, thumbnail, notes, currency } = req.body;
      const userId = req.auth.id;

      if (typeof images === "string") {
        try {
          let parsed = JSON.parse(images);
          if (Array.isArray(parsed)) {
            images = parsed;
          } else {
            images = [images];
          }
        } catch (e) {
          images = [images];
        }
      } else if (images && !Array.isArray(images)) {
        images = [images];
      }

      let videoUrl = req.body.video;
      let thumbnailUrl = req.body.thumbnail;

      // Check for file uploads
      if (req.files) {
        if (req.files.video) {
          videoUrl = await helper.fileUpload(req.files.video, "posts");
        }
        if (req.files.thumbnail) {
          thumbnailUrl = await helper.fileUpload(req.files.thumbnail, "posts");
        }
      }
      const category = await services_categories.findOne({ where: { id: categoryId } });
      if (!category) return helper.failed(res, 'Category not found or not available');

      const bookingNumber = 'BK' + Date.now() + Math.floor(Math.random() * 1000);

      const booking = await bookings.create({
        bookingNumber,
        bookingType,
        counterPrice: amount,
        userId,
        providerId: providerId,
        serviceId: categoryId,
        bookingDate,
        bookingTime,
        paymentStatus: 'pending',
        bookingStatus: 'pending',
        location, latitude, longitude,
        notes,
        video: videoUrl, thumbnail: thumbnailUrl,
        currency
      });

      if (images && Array.isArray(images) && images.length > 0) {
        const imageRecords = images.map(img => ({
          bookingId: booking.id,
          image: img
        }));
        await booking_images.bulkCreate(imageRecords);
      }

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
  acceptRejectRequestProvider: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        bookingId: 'required',
        status: 'required|in:accepted,reject,cancelled'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { bookingId, status, amount, bookingDate, bookingTime, date, time, notes, providerNotes, currency } = req.body;
      const userId = req.auth.id;

      const finalDate = date || bookingDate;
      const finalTime = time || bookingTime;

      const booking = await bookings.findOne({
        where: {
          id: bookingId,

          // providerId: userId
        }
      });
      if (!booking) return helper.failed(res, 'Booking not found or not authorized');

      if (booking.bookingStatus !== 'pending') {
        return helper.failed(res, 'Only pending bookings can be accepted or declined');
      }

      const finalStatus = status === 'reject' ? 'cancelled' : status;

      const updateData = { bookingStatus: finalStatus };

      if (notes) {
        updateData.notes = notes;
      }

      if (providerNotes) {
        updateData.providerNotes = providerNotes;
      }

      if (currency) {
        updateData.currency = currency;
      }

      let isCounterOffer = false;

      if (finalStatus === 'accepted' && (amount || finalDate || finalTime)) {
        if (booking.counterDate) {
          return helper.failed(res, 'Counter offer already sent');
        }
        isCounterOffer = true;
        updateData.bookingStatus = 'pending'; // keep it pending
        updateData.counterStatus = 'pending';
        if (finalDate) updateData.counterDate = finalDate;
        if (finalTime) updateData.counterTime = finalTime;
        if (amount) updateData.counterPrice = amount;
        if (amount) updateData.amount = amount;

      }

      await booking.update(updateData);

      if (isCounterOffer) {
        await sendBookingNotification(
          booking.userId,
          userId,
          'Booking Counter Offer',
          `Your booking #${booking.bookingNumber} received a counter offer.`,
          booking.id
        );
        return helper.success(res, 'Counter offer sent successfully', booking);
      } else {
        await sendBookingNotification(
          booking.userId,
          userId,
          'Booking ' + finalStatus,
          `Your booking #${booking.bookingNumber} has been ` + finalStatus,
          booking.id
        );
        return helper.success(res, 'Booking ' + finalStatus + ' successfully', booking);
      }
    } catch (error) {
      console.log("acceptRejectRequest error: ", error);
      return helper.error(res, 'Something went wrong');
    }
  },


  acceptRejectRequestUser: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        bookingId: 'required',
        status: 'required|in:accepted,reject'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { bookingId, status } = req.body;
      const userId = req.auth.id;

      const booking = await bookings.findOne({ where: { id: bookingId, userId: userId } });
      if (!booking) return helper.failed(res, 'Booking not found or not authorized');

      if (booking.counterStatus !== 'pending') {
        return helper.failed(res, 'Counter offer has already been responded to');
      }

      const finalStatus = status === 'reject' ? 'cancelled' : 'accepted';

      const updateData = {
        bookingStatus: status,
        counterStatus: status
      };

      if (status === 'accepted') {
        updateData.paymentStatus = 'paid';
        updateData.bookingDate = booking.counterDate || booking.bookingDate;
        updateData.bookingTime = booking.counterTime || booking.bookingTime;
        updateData.amount = booking.counterPrice || booking.amount;
      }

      await booking.update(updateData);

      await sendBookingNotification(
        booking.providerId,
        userId,
        'Counter Offer ' + finalStatus,
        `Your counter offer for booking #${booking.bookingNumber} was ${finalStatus}`,
        booking.id
      );

      return helper.success(res, `Counter offer ${finalStatus} successfully`, booking);
    } catch (error) {
      console.log("userRespondToCounterOffer error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

  payBookingOld: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        bookingId: 'required',
        // paymentMethodId: 'required'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { bookingId } = req.body;

      const booking = await bookings.findOne({
        where: { id: bookingId, userId: req.auth.id, paymentStatus: 'pending' }
      });
      if (!booking) return helper.failed(res, 'Booking not found or already paid');

      const paymentMethodId = `pm_1SYj5LAbpX3Rj95B3q20yX8g+${bookingId}`;
      const user = await users.findOne({ where: { id: req.auth.id } });
      // const amountInCents = Math.round(parseFloat(booking.amount) * 100);
      const paymentIntent = 1;

      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: amountInCents,
      //   currency: 'usd',
      //   payment_method: `${paymentMethodId}`,
      //   customer: user.customerId || undefined,
      //   confirm: true,
      //   automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
      // });

      // if (paymentIntent.status === 'succeeded') {
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
      // }


    } catch (error) {
      console.log(error);
      return helper.error(res, error.message || 'Payment processing failed');
    }
  },




  payBooking: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        amount: "required|numeric",
        type: "required|in:1,2", // 1 for booking, 2 for wallet top-up
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      const { type, bookingId } = req.body;
      const amount = parseFloat(req.body.amount);
      const userId = req.auth.id;

      if (amount <= 0) {
        return helper.failed(res, "Amount must be greater than 0");
      }

      const user = await users.findOne({ where: { id: userId } });
      if (!user) return helper.failed(res, "User not found");

      // Ensure customerId exists
      let customerId = user.customerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
        });
        customerId = customer.id;
        await user.update({ customerId });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: customerId,
        payment_method_types: ['card'],
      });

      if (type == 1) {
        // Booking payment
        if (!bookingId) return helper.failed(res, "bookingId is required for type 1");
        const booking = await bookings.findOne({ where: { id: bookingId } });
        if (!booking) return helper.failed(res, "Booking not found");

        const adminCommission = parseFloat(((ADMIN_COMMISSION_PERCENT / 100) * amount).toFixed(2));
        const providerAmount = parseFloat((amount - adminCommission).toFixed(2));

        await payments.create({
          userId,
          bookingId,
          amount,
          adminCommission,
          providerAmount,
          paymentStatus: 'pending',
          transactionId: paymentIntent.id
        });

      } else if (type == 2) {
        // Wallet top-up
        await wallet_transactions.create({
          userId,
          amount,
          type: 'credit',
          status: 'pending',
          referenceId: paymentIntent.id,
          description: 'Wallet Top-up'
        });
      }

      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: "2024-12-18.acacia" }
      );

      let paymentResponse = {
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        publishableKey: envfile.stripe_publish_key,
        transactionId: paymentIntent.id,
        currency: paymentIntent.currency,
        country: "US"
      };

      return helper.success(res, "Payment Intent created successfully", {
        paymentResponse,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        customerId
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, "Error occurred while processing payment");
    }
  },

  stripe_status_update: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        paymentIntent: "required",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      const { paymentIntent } = req.body;

      // Verify payment intent status with Stripe
      const pi = await stripe.paymentIntents.retrieve(paymentIntent);
      if (pi.status !== 'succeeded') {
        return helper.failed(res, "Payment not successful");
      }

      // Check if it's a booking payment
      const payment = await payments.findOne({ where: { transactionId: paymentIntent } });
      if (payment && payment.paymentStatus === 'pending') {
        await payment.update({ paymentStatus: 'success' });
        await bookings.update({ paymentStatus: 'paid' }, { where: { id: payment.bookingId } });

        const booking = await bookings.findOne({ where: { id: payment.bookingId } });

        // Add funds to provider's wallet
        if (booking && payment.providerAmount) {
          await users.increment(
            { walletAmount: payment.providerAmount, totalEarning: payment.providerAmount, pendingAmount: payment.providerAmount },
            { where: { id: booking.providerId } }
          );
        }
        return helper.success(res, "Booking payment successfully completed");
      }

      // Check if it's a wallet top-up
      const walletTx = await wallet_transactions.findOne({ where: { referenceId: paymentIntent } });
      if (walletTx && walletTx.status === 'pending') {
        await walletTx.update({ status: 'completed' });

        // Add funds to user's wallet
        await users.increment(
          { walletAmount: walletTx.amount },
          { where: { id: walletTx.userId } }
        );
        return helper.success(res, "Wallet top-up successfully completed");
      }

      return helper.failed(res, "Payment record not found or already processed");

    } catch (error) {
      console.log("Stripe status update error:", error);
      return helper.error(res, "Error occurred while updating payment status");
    }
  },

  getUserBookings: async (req, res) => {
    try {
      const { Op } = db.Sequelize;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { type } = req.query;

      let whereClause = {
        userId: req.auth.id,
      };

      if (type == 1) {
        whereClause.bookingStatus = { [Op.in]: ['accepted', 'upcoming'] };
        whereClause.paymentStatus = 'paid';
        whereClause[Op.and] = [
          {
            [Op.or]: [
              { counterDate: null },
              { counterStatus: 'accepted' }
            ]
          }
        ];
      } else if (type == 2) {
        whereClause.bookingStatus = { [Op.in]: ['ongoing', 'active'] };
      } else if (type == 3) {
        whereClause.bookingStatus = 'completed';
      } else if (type == 4) {
        whereClause.bookingStatus = { [Op.in]: ['cancelled', 'reject'] };
      } else {
        whereClause.bookingStatus = { [Op.notIn]: ['pending'] };
      }

      let findBookings = await bookings.findAll({
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
          },
          {
            model: users,
            as: 'provider',
            attributes: [
              'id', 'name', 'profileImage',
              [
                db.sequelize.literal(`(
                  SELECT IFNULL(ROUND(AVG(rating),1),0)
                  FROM rating
                  WHERE rating.providerId = provider.id
                )`),
                "avgRating"
              ]
            ]
          },
          {
            model: booking_images,
            as: 'bookingImages',
            attributes: ['id', 'image']
          }
        ],
        order: [['bookingDate', 'ASC']],
        limit,
        offset
      });

      return helper.success(res, 'Bookings fetched', {
        data: findBookings,
        pagination: {
          page,
          limit,
          hasNextPage: findBookings.length === limit
        }
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },
  getUserPendingBookings: async (req, res) => {
    try {
      const { Op } = db.Sequelize;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      let findBookings = await bookings.findAll({
        where: {
          userId: req.auth.id,
          [Op.or]: [
            { bookingStatus: 'pending' },
            { bookingStatus: { [Op.in]: ['accepted', 'upcoming'] }, paymentStatus: 'pending' }
          ]
        },
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
          },
          {
            model: users,
            as: 'provider',
            attributes: [
              'id', 'name', 'profileImage',
              [
                db.sequelize.literal(`(
                  SELECT IFNULL(ROUND(AVG(rating),1),0)
                  FROM rating
                  WHERE rating.providerId = provider.id
                )`),
                "avgRating"
              ]
            ]
          },
          {
            model: booking_images,
            as: 'bookingImages',
            attributes: ['id', 'image']
          }
        ],
        order: [['bookingDate', 'ASC']],
        limit,
        offset
      });

      return helper.success(res, 'Bookings fetched', {
        data: findBookings,
        pagination: {
          page,
          limit,
          hasNextPage: findBookings.length === limit
        }
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },
  getProviderPendingBookings: async (req, res) => {
    try {
      const { Op } = db.Sequelize;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      let whereClause = {
        providerId: req.auth.id,
        [Op.or]: [
          { bookingStatus: 'pending' },
          { bookingStatus: { [Op.in]: ['accepted', 'upcoming'] }, paymentStatus: 'pending' }
        ]
      };

      let findBookings = await bookings.findAll({
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
          },
          {
            model: users,
            as: 'provider',
            attributes: [
              'id', 'name', 'profileImage',
              [
                db.sequelize.literal(`(
                  SELECT IFNULL(ROUND(AVG(rating),1),0)
                  FROM rating
                  WHERE rating.providerId = provider.id
                )`),
                "avgRating"
              ]
            ]
          },
          {
            model: booking_images,
            as: 'bookingImages',
            attributes: ['id', 'image']
          }
        ],
        order: [['bookingDate', 'ASC']],
        limit,
        offset
      });

      return helper.success(res, 'Bookings fetched', {
        data: findBookings,
        pagination: {
          page,
          limit,
          hasNextPage: findBookings.length === limit
        }
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
        providerId: req.auth.id,
      };

      // =========================
      // TYPE FILTER LOGIC
      // =========================

      // 1 = UPCOMING
      if (type == 1) {
        whereClause.bookingStatus = { [Op.in]: ['accepted', 'upcoming'] };
        whereClause.paymentStatus = 'paid';
        whereClause[Op.and] = [
          {
            [Op.or]: [
              { counterDate: null },
              { counterStatus: 'accepted' }
            ]
          }
        ];
      }

      // 2 = ONGOING
      if (type == 2) {
        whereClause.bookingStatus = { [Op.in]: ['ongoing', 'active'] };

        // whereClause.bookingStatus = 'ongoing';
        // whereClause.bookingStatus = 'active';

      }

      // 3 = PAST
      if (type == 3) {
        whereClause.bookingStatus = 'completed';
      }

      // 4 = CANCELLED
      if (type == 4) {
        whereClause.bookingStatus = {
          [Op.in]: ['cancelled', 'reject']
        };
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
          },
          {
            model: users,
            as: 'provider',
            attributes: [
              'id', 'name', 'profileImage',
              [
                db.sequelize.literal(`(
                  SELECT IFNULL(ROUND(AVG(rating),1),0)
                  FROM rating
                  WHERE rating.providerId = provider.id
                )`),
                "avgRating"
              ]
            ]
          },
          {
            model: booking_images,
            as: 'bookingImages',
            attributes: ['id', 'image']
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
          { model: users, as: 'provider', attributes: ['id', 'name', 'profileImage', 'phone'] },
          { model: booking_images, as: 'bookingImages', attributes: ['id', 'image'] },
          {
            model: rating,
            as: 'rating',
            attributes: ['id', 'rating', 'review', 'image'],
            // include: [{ model: users, as: 'user', attributes: ['id', 'name', 'profileImage'] }]
          }
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

  startWork: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        bookingId: 'required',
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { bookingId } = req.body;
      const userId = req.auth.id;

      const booking = await bookings.findOne({
        where: { id: bookingId }
      });

      if (!booking) {
        return helper.failed(res, 'Booking not found');
      }

      if (booking.bookingStatus === 'completed' || booking.bookingStatus === 'cancelled') {
        return helper.failed(res, `Booking already ${booking.bookingStatus}`);
      }

      let updateData = { bookingStatus: 'active' };

      await booking.update(updateData);

      let notifyUserId = booking.providerId === userId ? booking.userId : booking.providerId;
      let notifyMsg = `Booking has started`;

      await sendBookingNotification(
        notifyUserId,
        userId,
        'Booking Update',
        notifyMsg,
        bookingId
      );

      return helper.success(res, `Booking started successfully`);

    } catch (error) {
      console.log("startWork error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

  startTracking: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        bookingId: 'required',
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { bookingId } = req.body;
      const userId = req.auth.id;

      const booking = await bookings.findOne({
        where: { id: bookingId }
      });

      if (!booking) {
        return helper.failed(res, 'Booking not found');
      }

      if (booking.bookingStatus === 'completed' || booking.bookingStatus === 'cancelled') {
        return helper.failed(res, `Booking already ${booking.bookingStatus}`);
      }

      let updateData = { bookingStatus: 'ongoing' };

      await booking.update(updateData);

      let notifyUserId = booking.providerId === userId ? booking.userId : booking.providerId;
      let notifyMsg = `Provider has started tracking for the booking`;

      await sendBookingNotification(
        notifyUserId,
        userId,
        'Booking Update',
        notifyMsg,
        bookingId
      );

      return helper.success(res, `Tracking started successfully`);

    } catch (error) {
      console.log("startTracking error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

  completeWork: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        bookingId: "required",
      });

      const errors = await helper.checkValidation(v);
      if (errors) {
        return helper.failed(res, errors);
      }

      const { bookingId, comment } = req.body;
      const providerId = req.auth.id;

      // =========================================
      // FIND BOOKING
      // =========================================
      const booking = await bookings.findOne({
        where: {
          id: bookingId,
        },
      });

      if (!booking) {
        return helper.failed(res, "Booking not found");
      }

      // =========================================
      // CHECK PROVIDER
      // =========================================
      if (Number(booking.providerId) !== Number(providerId)) {
        return helper.failed(
          res,
          "You are not authorized to complete this booking"
        );
      }

      // =========================================
      // CHECK BOOKING STATUS
      // =========================================
      if (booking.bookingStatus === "completed") {
        return helper.failed(res, "Booking already completed");
      }

      if (booking.bookingStatus === "cancelled") {
        return helper.failed(res, "Booking already cancelled");
      }

      // =========================================
      // FILE VARIABLES
      // =========================================
      let videoUrl = booking.video || null;
      let thumbnailUrl = booking.thumbnail || null;

      // =========================================
      // VIDEO + THUMBNAIL OPTIONAL
      // =========================================
      if (req.files) {
        if (req.files.video) {
          videoUrl = await helper.fileUpload(
            req.files.video,
            "bookings"
          );
        }

        if (req.files.thumbnail) {
          thumbnailUrl = await helper.fileUpload(
            req.files.thumbnail,
            "bookings"
          );
        }
      }

      // =========================================
      // UPDATE BOOKING
      // =========================================
      const updateData = {
        bookingStatus: "completed",
        video: videoUrl,
        thumbnail: thumbnailUrl,
      };

      // Comment optional
      if (comment !== undefined && comment !== null) {
        updateData.comment = comment;
      }

      await booking.update(updateData);

      // =========================================
      // MULTIPLE IMAGES OPTIONAL
      // =========================================

      /*
        Frontend/Postman can send:
  
        images: [file1, file2, file3]
  
        OR
  
        images: file1
        images: file2
        images: file3
      */

      let images = [];

      if (req.files && req.files.images) {
        images = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];
      }

      if (images.length > 0) {
        const imageRecords = [];

        for (const image of images) {
          const imageUrl = await helper.fileUpload(
            image,
            "bookings"
          );

          imageRecords.push({
            bookingId: booking.id,
            image: imageUrl,
          });
        }

        if (imageRecords.length > 0) {
          await booking_images.bulkCreate(imageRecords);
        }
      }

      // =========================================
      // NOTIFICATION TO USER
      // =========================================
      const notifyUserId = booking.userId;

      await sendBookingNotification(
        notifyUserId,
        providerId,
        "Booking Completed",
        "Your booking has been completed successfully",
        bookingId
      );

      // =========================================
      // SUCCESS
      // =========================================
      return helper.success(
        res,
        "Booking completed successfully"
      );

    } catch (error) {
      console.log("completeWork error:", error);

      return helper.error(
        res,
        "Something went wrong"
      );
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

      await sendBookingNotification(
        booking.providerId,
        userId,
        'New Rating Received',
        `You received a new rating of ${ratingCount} stars`,
        booking.id
      );

      return helper.success(res, 'Rating given successfully', ratingData);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },


  userRatingList: async (req, res) => {
    try {

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // =========================
      // REVIEWS LIST (PAGINATION)
      // =========================
      const ratingData = await rating.findAll({
        where: { providerId: req.query.userId },
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
        where: { providerId: req.query.userId },
      });

      // =========================
      // STAR WISE COUNT (1-5)
      // =========================
      const starCounts = await rating.findAll({
        where: { providerId: req.query.userId },
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
        where: { providerId: req.query.userId },
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
      console.log("userRatingList error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },
};
