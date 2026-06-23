const cron = require('node-cron');
const { Op } = require('sequelize');
const db = require('../models');
const helper = require('../helpers/helper');

const sendReminder = async (booking, hoursLabel) => {
  try {
    const [user, provider] = await Promise.all([
      db.users.findOne({ where: { id: booking.userId } }),
      db.users.findOne({ where: { id: booking.providerId } })
    ]);

    const message = `Reminder: Booking #${booking.bookingNumber} is scheduled in ${hoursLabel}.`;

    for (const recipient of [user, provider].filter(Boolean)) {
      await db.notifications.create({
        userId: recipient.id,
        title: 'Booking Reminder',
        message,
        type: 'booking',
        referenceId: booking.id
      });

      if (recipient.fcmToken) {
        await helper.sendPushNotification({
          token: recipient.fcmToken,
          title: 'Booking Reminder',
          body: message,
          type: 'booking',
          request_id: booking.id
        });
      }
    }
  } catch (err) {
    console.log('Booking reminder error:', err.message);
  }
};

module.exports = () => {
  // Run every hour — send reminders for bookings in next 24h and 1h
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in1h = new Date(now.getTime() + 60 * 60 * 1000);

      const upcoming = await db.bookings.findAll({
        where: {
          bookingStatus: { [Op.in]: ['pending', 'accepted'] },
          bookingDate: { [Op.gte]: now.toISOString().split('T')[0] }
        }
      });

      for (const booking of upcoming) {
        const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime || '00:00:00'}`);
        const diffHours = (bookingDateTime - now) / (1000 * 60 * 60);

        if (diffHours > 23 && diffHours <= 24) {
          await sendReminder(booking, '24 hours');
        } else if (diffHours > 0 && diffHours <= 1) {
          await sendReminder(booking, '1 hour');
        }
      }
    } catch (err) {
      console.log('Cron booking reminder failed:', err.message);
    }
  });

  console.log('Booking reminder cron scheduled');
};
