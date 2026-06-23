const db = require('../../models');
const helper = require('../../helpers/helper');

module.exports = {
  getFraudAlerts: async (req, res) => {
    try {
      // 1. High value withdrawals
      const highWithdrawals = await db.sequelize.query(`
        SELECT w.id as referenceId, w.amount, w.providerId as userId, u.name as userName, u.email as userEmail, 'Suspicious Withdrawal' as reason, 'High' as severity, w.createdAt
        FROM withdrawal_requests w
        JOIN users u ON w.providerId = u.id
        WHERE w.amount > 500 AND w.status = 'pending'
      `, { type: db.sequelize.QueryTypes.SELECT });

      // 2. Fake Bookings (Same user booking same provider > 3 times)
      const fakeBookings = await db.sequelize.query(`
        SELECT b.userId, u.name as userName, u.email as userEmail, b.providerId, p.name as providerName, COUNT(b.id) as count, 'Fake Bookings' as reason, 'High' as severity, MAX(b.createdAt) as createdAt
        FROM bookings b
        JOIN users u ON b.userId = u.id
        JOIN users p ON b.providerId = p.id
        GROUP BY b.userId, u.name, u.email, b.providerId, p.name
        HAVING COUNT(b.id) > 3
      `, { type: db.sequelize.QueryTypes.SELECT });

      // 3. Multiple Accounts (Same device token or phone number)
      const multipleAccounts = await db.sequelize.query(`
        SELECT phone, COUNT(id) as count, GROUP_CONCAT(name) as userName, GROUP_CONCAT(id) as userIdStr, 'Multiple Accounts' as reason, 'Medium' as severity, MAX(createdAt) as createdAt
        FROM users
        WHERE phone IS NOT NULL AND phone != ''
        GROUP BY phone
        HAVING COUNT(id) > 1
      `, { type: db.sequelize.QueryTypes.SELECT });

      // 4. Disputes
      const suspiciousDisputes = await db.sequelize.query(`
        SELECT d.userId, u.name as userName, u.email as userEmail, COUNT(d.id) as count, 'Suspicious Disputes' as reason, 'Medium' as severity, MAX(d.createdAt) as createdAt
        FROM disputes d
        JOIN users u ON d.userId = u.id
        GROUP BY d.userId, u.name, u.email
        HAVING COUNT(d.id) > 2
      `, { type: db.sequelize.QueryTypes.SELECT });

      // Combine all
      const alerts = [];
      
      highWithdrawals.forEach(row => alerts.push({
        id: 'w_' + row.referenceId,
        user: { id: row.userId, name: row.userName, email: row.userEmail },
        reason: row.reason,
        details: `Amount: $${row.amount}`,
        severity: row.severity,
        date: row.createdAt
      }));

      fakeBookings.forEach(row => alerts.push({
        id: 'fb_' + row.userId + '_' + row.providerId,
        user: { id: row.userId, name: row.userName, email: row.userEmail },
        reason: row.reason,
        details: `${row.count} bookings with provider ${row.providerName}`,
        severity: row.severity,
        date: row.createdAt
      }));

      multipleAccounts.forEach((row, i) => alerts.push({
        id: 'ma_' + i,
        user: { id: row.userIdStr ? row.userIdStr.split(',')[0] : 'N/A', name: row.userName, email: row.phone }, // map to first user
        reason: row.reason,
        details: `${row.count} accounts with same phone: ${row.phone}`,
        severity: row.severity,
        date: row.createdAt
      }));

      suspiciousDisputes.forEach(row => alerts.push({
        id: 'd_' + row.userId,
        user: { id: row.userId, name: row.userName, email: row.userEmail },
        reason: row.reason,
        details: `Opened ${row.count} disputes`,
        severity: row.severity,
        date: row.createdAt
      }));
      
      // Sort by date DESC
      alerts.sort((a, b) => new Date(b.date) - new Date(a.date));

      return helper.success(res, "Fraud alerts retrieved", alerts);

    } catch (err) {
      console.error(err);
      return helper.error(res, "Internal server error");
    }
  }
};
