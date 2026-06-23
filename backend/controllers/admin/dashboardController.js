const db = require('../../models');
const { Op, fn, col } = require('sequelize');
const helper = require('../../helpers/helper');

const monthSeries = (rows, keyField = 'count') => {
  const out = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, [keyField]: 0 }));
  rows.forEach((r) => {
    const m = parseInt(r.month, 10);
    if (m >= 1 && m <= 12) out[m - 1][keyField] = parseFloat(r[keyField]) || 0;
  });
  return out;
};

module.exports = {
  dashboard_data: async (req, res) => {
    try {
      const [
        usersCount,
        providersCount,
        bookingsCount,
        activeBookings,
        pendingWithdrawals,
      ] = await Promise.all([
        db.users.count({ where: { role: 'user' } }),
        db.users.count({ where: { isProvider: 1, providerStatus: 'approved' } }),
        db.bookings.count(),
        db.bookings.count({ where: { bookingStatus: { [Op.in]: ['pending', 'accepted'] } } }),
        db.withdrawal_requests.count({ where: { status: 'pending' } }),
      ]);

      const totalRevenueRow = await db.payments.findOne({
        attributes: [[fn('COALESCE', fn('SUM', col('adminCommission')), 0), 'total']],
        where: { paymentStatus: 'success' },
        raw: true,
      });

      const now = new Date();
      const monthlyRevenueRow = await db.payments.findOne({
        attributes: [[fn('COALESCE', fn('SUM', col('adminCommission')), 0), 'total']],
        where: {
          paymentStatus: 'success',
          createdAt: {
            [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1),
            [Op.lt]: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
        raw: true,
      });

      const recentBookings = await db.bookings.findAll({
        limit: 8,
        order: [['createdAt', 'DESC']],
        include: [
          { model: db.users, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: db.users, as: 'provider', attributes: ['id', 'name'] },
          { model: db.services, as: 'service', attributes: ['id', 'title'] },
        ],
      });

      const recentUsers = await db.users.findAll({
        where: { role: 'user' },
        limit: 8,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'name', 'email', 'phone', 'status', 'createdAt'],
      });

      const recentProviders = await db.users.findAll({
        where: { isProvider: 1 },
        limit: 8,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'name', 'email', 'providerStatus', 'createdAt'],
      });

      const avgBookingValueRow = await db.bookings.findOne({
        attributes: [[fn('COALESCE', fn('AVG', col('amount')), 0), 'avgValue']],
        raw: true,
      });

      const topCategoriesRaw = await db.bookings.findAll({
        attributes: [
          [col('service.category.categoryName'), 'categoryName'],
          [fn('COUNT', col('bookings.id')), 'count']
        ],
        include: [{
          model: db.services,
          as: 'service',
          attributes: [],
          include: [{
            model: db.services_categories,
            as: 'category',
            attributes: []
          }]
        }],
        group: ['service.categoryId', 'service.category.categoryName'],
        order: [[fn('COUNT', col('bookings.id')), 'DESC']],
        limit: 5,
        raw: true
      });

      const topLocationsRaw = await db.bookings.findAll({
        attributes: [
          [col('service.location'), 'locationName'],
          [fn('COUNT', col('bookings.id')), 'count']
        ],
        include: [{
          model: db.services,
          as: 'service',
          attributes: []
        }],
        group: ['service.location'],
        order: [[fn('COUNT', col('bookings.id')), 'DESC']],
        limit: 5,
        raw: true
      });

      const topCategories = topCategoriesRaw.map(c => ({
        name: c.categoryName || c['service.category.categoryName'] || 'Unknown Category',
        count: c.count || 0
      }));

      const topLocations = topLocationsRaw.map(l => ({
        name: l.locationName || l['service.location'] || 'Unknown Location',
        count: l.count || 0
      }));

      return helper.success(res, 'Dashboard data fetched', {
        data: {
          usersCount,
          providersCount,
          bookingsCount,
          activeBookings,
          pendingWithdrawals,
          totalRevenue: Number(totalRevenueRow?.total || 0),
          monthlyRevenue: Number(monthlyRevenueRow?.total || 0),
          averageBookingValue: Number(avgBookingValueRow?.avgValue || 0),
        },
        topCategories,
        topLocations,
        recentBookings,
        recentUsers,
        recentProviders,
      });
    } catch (err) {
      console.log(err);
      return helper.error(res, 'Something went wrong');
    }
  },

  getMonthlyUserStats: async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      const range = {
        [Op.gte]: new Date(`${currentYear}-01-01`),
        [Op.lte]: new Date(`${currentYear}-12-31 23:59:59`),
      };

      const usersData = await db.users.findAll({
        attributes: [
          [fn('MONTH', col('createdAt')), 'month'],
          'role',
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { role: { [Op.in]: ['user', 'admin'] }, createdAt: range },
        group: ['month', 'role'],
        raw: true,
      });

      const providersData = await db.users.findAll({
        attributes: [
          [fn('MONTH', col('createdAt')), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { isProvider: 1, createdAt: range },
        group: ['month'],
        raw: true,
      });

      const bookingsData = await db.bookings.findAll({
        attributes: [
          [fn('MONTH', col('createdAt')), 'month'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { createdAt: range },
        group: ['month'],
        raw: true,
      });

      const revenueData = await db.payments.findAll({
        attributes: [
          [fn('MONTH', col('createdAt')), 'month'],
          [fn('COALESCE', fn('SUM', col('adminCommission')), 0), 'total'],
        ],
        where: { paymentStatus: 'success', createdAt: range },
        group: ['month'],
        raw: true,
      });

      const monthlyUsers = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, user: 0, provider: 0 }));
      usersData.forEach(({ month, role, count }) => {
        const idx = month - 1;
        if (role === 'user') monthlyUsers[idx].user = parseInt(count, 10);
      });
      providersData.forEach(({ month, count }) => {
        const idx = month - 1;
        if (idx >= 0) monthlyUsers[idx].provider = parseInt(count, 10);
      });

      return helper.success(res, 'Monthly stats fetched', {
        data: monthlyUsers,
        bookings: monthSeries(bookingsData, 'count'),
        revenue: monthSeries(revenueData, 'total'),
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },
};
