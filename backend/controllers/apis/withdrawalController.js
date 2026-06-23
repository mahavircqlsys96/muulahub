const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const db = require('../../models');
const { users, withdrawal_requests, notifications } = db;

module.exports = {

  request_withdrawal: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        amount: 'required',
        bankName: 'required|string',
        accountNumber: 'required|string',
        ifscCode: 'required|string'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { amount, bankName, accountNumber, ifscCode } = req.body;
      const providerId = req.auth.id;
      const requestAmount = parseFloat(amount);

      if (requestAmount <= 0) return helper.failed(res, 'Amount must be greater than 0');

      const provider = await users.findOne({ where: { id: providerId } });
      if (!provider) return helper.failed(res, 'Provider not found');

      const availableBalance = parseFloat(provider.walletAmount) || 0;
      if (requestAmount > availableBalance) {
        return helper.failed(res, `Insufficient wallet balance. Available: $${availableBalance.toFixed(2)}`);
      }

      const pendingRequest = await withdrawal_requests.findOne({
        where: { providerId, status: 'pending' }
      });
      if (pendingRequest) {
        return helper.failed(res, 'You already have a pending withdrawal request');
      }

      const withdrawal = await withdrawal_requests.create({
        providerId,
        amount: requestAmount,
        bankName,
        accountNumber,
        ifscCode,
        status: 'pending'
      });

      await users.decrement({ walletAmount: requestAmount }, { where: { id: providerId } });

      return helper.success(res, 'Withdrawal request submitted successfully', withdrawal);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  get_withdrawal_history: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await withdrawal_requests.findAndCountAll({
        where: { providerId: req.auth.id },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return helper.success(res, 'Withdrawal history fetched', {
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

  get_withdrawal_detail: async (req, res) => {
    try {
      const { id } = req.params;
      const withdrawal = await withdrawal_requests.findOne({
        where: { id, providerId: req.auth.id }
      });
      if (!withdrawal) return helper.failed(res, 'Withdrawal request not found');
      return helper.success(res, 'Withdrawal detail fetched', withdrawal);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
