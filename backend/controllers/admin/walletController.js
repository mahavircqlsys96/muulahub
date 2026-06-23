const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { users, wallet_transactions } = db;

module.exports = {
  walletList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const role = req.query.role; // 'user' or 'admin' or filtering by isProvider

      const andParts = [];
      if (search) {
        andParts.push({
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        });
      }
      
      if (role === 'provider') {
        andParts.push({ isProvider: 1 });
      } else if (role === 'user') {
        andParts.push({ role: 'user', isProvider: 0 });
      } else {
        andParts.push({ role: 'user' }); // Exclude admins
      }

      const whereClause = andParts.length ? { [Op.and]: andParts } : { role: 'user' };

      const { count, rows } = await users.findAndCountAll({
        where: whereClause,
        attributes: ['id', 'name', 'email', 'phone', 'role', 'isProvider', 'walletAmount', 'pendingAmount', 'withdrawnAmount', 'isWalletFrozen'],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return helper.success(res, 'Wallets fetched', {
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

  walletTransactions: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const userId = req.query.userId;

      const whereClause = {};
      if (userId) whereClause.userId = userId;

      const { count, rows } = await wallet_transactions.findAndCountAll({
        where: whereClause,
        include: [
          { model: users, as: 'user', attributes: ['id', 'name', 'email'] }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return helper.success(res, 'Wallet transactions fetched', {
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

  updateWallet: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const v = new Validator(req.body, {
        userId: 'required|integer',
        amount: 'required|numeric',
        type: 'required|in:credit,debit',
        description: 'required|string'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { userId, amount, type, description } = req.body;
      const user = await users.findOne({ where: { id: userId } });
      
      if (!user) return helper.failed(res, 'User not found');
      
      const parsedAmount = parseFloat(amount);
      if (parsedAmount <= 0) return helper.failed(res, 'Amount must be greater than zero');

      if (type === 'debit' && parseFloat(user.walletAmount) < parsedAmount) {
        return helper.failed(res, 'Insufficient wallet balance to debit');
      }

      if (type === 'credit') {
        await user.increment('walletAmount', { by: parsedAmount, transaction: t });
      } else {
        await user.decrement('walletAmount', { by: parsedAmount, transaction: t });
      }

      await wallet_transactions.create({
        userId,
        amount: parsedAmount,
        type,
        status: 'completed',
        description,
        referenceId: 'admin_manual'
      }, { transaction: t });

      await t.commit();
      return helper.success(res, `Wallet ${type}ed successfully`);
    } catch (error) {
      await t.rollback();
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  freezeWallet: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await users.findOne({ where: { id } });
      if (!user) return helper.failed(res, 'User not found');

      const isWalletFrozen = user.isWalletFrozen ? 0 : 1;
      await user.update({ isWalletFrozen });

      return helper.success(res, `Wallet ${isWalletFrozen ? 'frozen' : 'unfrozen'} successfully`);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
