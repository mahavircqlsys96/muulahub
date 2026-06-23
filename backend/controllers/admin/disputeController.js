const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { users, bookings, disputes, wallet_transactions } = db;

module.exports = {
  disputeList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status;

      const whereClause = {};
      if (status) whereClause.status = status;

      const { count, rows } = await disputes.findAndCountAll({
        where: whereClause,
        include: [
          { model: bookings, as: 'booking', attributes: ['id', 'bookingNumber', 'amount'] },
          { model: users, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: users, as: 'provider', attributes: ['id', 'name', 'email'] }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Disputes fetched', {
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

  disputeDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const dispute = await disputes.findOne({
        where: { id },
        include: [
          { model: bookings, as: 'booking' },
          { model: users, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'walletAmount'] },
          { model: users, as: 'provider', attributes: ['id', 'name', 'email', 'phone', 'walletAmount'] }
        ]
      });

      if (!dispute) return helper.failed(res, 'Dispute not found');
      return helper.success(res, 'Dispute detail fetched', dispute);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  resolveDispute: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const v = new Validator(req.body, {
        status: 'required|in:resolved,refunded,partial_refund,escrow_released',
        amount: 'numeric' // For partial refunds or specific amounts
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { id } = req.params;
      const { status, amount, adminNotes } = req.body;

      const dispute = await disputes.findOne({
        where: { id },
        include: [{ model: bookings, as: 'booking' }]
      });

      if (!dispute) return helper.failed(res, 'Dispute not found');
      if (dispute.status !== 'pending') return helper.failed(res, 'Dispute is already handled');

      const user = await users.findOne({ where: { id: dispute.userId } });
      const provider = await users.findOne({ where: { id: dispute.providerId } });
      const disputeAmount = parseFloat(amount || dispute.amount);

      // Handle the escrow release logic
      if (status === 'refunded') {
        // Full refund to user
        await user.increment('walletAmount', { by: disputeAmount, transaction: t });
        await wallet_transactions.create({
          userId: user.id,
          amount: disputeAmount,
          type: 'credit',
          status: 'completed',
          description: 'Full refund for dispute',
          referenceId: dispute.id.toString()
        }, { transaction: t });
      } else if (status === 'escrow_released') {
        // Release to provider
        await provider.increment('walletAmount', { by: disputeAmount, transaction: t });
        // Deduct from provider pending amount if that exists
        if (parseFloat(provider.pendingAmount) >= disputeAmount) {
          await provider.decrement('pendingAmount', { by: disputeAmount, transaction: t });
        }
        await wallet_transactions.create({
          userId: provider.id,
          amount: disputeAmount,
          type: 'credit',
          status: 'completed',
          description: 'Escrow released for dispute',
          referenceId: dispute.id.toString()
        }, { transaction: t });
      } else if (status === 'partial_refund') {
        // Partial refund to user, remainder to provider
        const totalBookingAmount = parseFloat(dispute.booking.amount);
        const remainder = totalBookingAmount - disputeAmount;

        if (disputeAmount > 0) {
          await user.increment('walletAmount', { by: disputeAmount, transaction: t });
          await wallet_transactions.create({
            userId: user.id,
            amount: disputeAmount,
            type: 'credit',
            status: 'completed',
            description: 'Partial refund for dispute',
            referenceId: dispute.id.toString()
          }, { transaction: t });
        }

        if (remainder > 0) {
          await provider.increment('walletAmount', { by: remainder, transaction: t });
          if (parseFloat(provider.pendingAmount) >= remainder) {
             await provider.decrement('pendingAmount', { by: remainder, transaction: t });
          }
          await wallet_transactions.create({
            userId: provider.id,
            amount: remainder,
            type: 'credit',
            status: 'completed',
            description: 'Escrow released (partial) for dispute',
            referenceId: dispute.id.toString()
          }, { transaction: t });
        }
      }

      await dispute.update({
        status,
        adminNotes: adminNotes || dispute.adminNotes,
        amount: disputeAmount
      }, { transaction: t });

      await t.commit();
      return helper.success(res, 'Dispute resolved successfully');
    } catch (error) {
      await t.rollback();
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
