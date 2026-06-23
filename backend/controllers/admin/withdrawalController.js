const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { users, withdrawal_requests, notifications } = db;

module.exports = {

  withdrawalList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status;

      let whereClause = {};
      if (status) whereClause.status = status;

      const { count, rows } = await withdrawal_requests.findAndCountAll({
        where: whereClause,
        include: [{
          model: users,
          as: 'provider',
          attributes: ['id', 'name', 'email', 'phone', 'walletAmount', 'totalEarning']
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Withdrawal requests fetched', {
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

  updateWithdrawalStatus: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        status: 'required|in:approved,rejected'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { id } = req.params;
      const { status, remarks } = req.body;

      const withdrawal = await withdrawal_requests.findOne({ where: { id } });
      if (!withdrawal) return helper.failed(res, 'Withdrawal request not found');

      if (withdrawal.status !== 'pending') {
        return helper.failed(res, `Request is already ${withdrawal.status}`);
      }

      await withdrawal.update({ status, remarks: remarks || null });

      if (status === 'rejected') {
        await users.increment({ walletAmount: withdrawal.amount }, { where: { id: withdrawal.providerId } });
      } else if (status === 'approved') {
        await users.increment({ withdrawnAmount: withdrawal.amount }, { where: { id: withdrawal.providerId } });
      }

      const notifyMessage = status === 'approved'
        ? `Your withdrawal request of $${withdrawal.amount} has been approved.`
        : `Your withdrawal request of $${withdrawal.amount} has been rejected. ${remarks || ''} Amount has been credited back to your wallet.`;

      await notifications.create({
        userId: withdrawal.providerId,
        title: 'Withdrawal Request Update',
        message: notifyMessage,
        type: 'withdrawal'
      });

      const provider = await users.findOne({ where: { id: withdrawal.providerId } });
      if (provider && provider.fcmToken) {
        await helper.sendPushNotification({
          token: provider.fcmToken,
          title: 'Withdrawal Update',
          body: notifyMessage,
          type: 'payment',
          sender_id: req.auth.id
        });
      }

      return helper.success(res, `Withdrawal request ${status}`);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  withdrawalDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const withdrawal = await withdrawal_requests.findOne({
        where: { id },
        include: [{ model: users, as: 'provider', attributes: ['id', 'name', 'email', 'phone', 'walletAmount'] }]
      });

      if (!withdrawal) return helper.failed(res, 'Withdrawal not found');
      return helper.success(res, 'Withdrawal detail fetched', withdrawal);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
