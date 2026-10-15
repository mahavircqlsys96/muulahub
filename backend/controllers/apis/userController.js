const envfile = process.env;
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op, fn, col } = require('sequelize');
const db = require('../../models');
const { users, services, bookings, posts, followers, notifications, post_media, services_categories, portfolio_images, wallet_transactions, search_appearances, bank_accounts, payments, withdrawal_requests } = db;

module.exports = {

  home: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const offset = (page - 1) * limit;

      const searchKey = req.query.searchKey || "";
      const categoryId = req.query.categoryId;

      let whereCondition = {
        status: 'active',
        type: 'publish',
      };

      if (req.auth) {
        whereCondition.userId = { [Op.ne]: req.auth.id };
      }

      if (categoryId) {
        whereCondition.categoryId = categoryId;
      }

      // ✅ Add search filter
      if (searchKey.trim()) {
        whereCondition = {
          ...whereCondition,
          [db.Sequelize.Op.or]: [
            {
              caption: {
                [db.Sequelize.Op.like]: `%${searchKey}%`
              }
            },
            {
              hashtags: {
                [db.Sequelize.Op.like]: `%${searchKey}%`
              }
            }
          ]
        };
      }

      let findPosts = await posts.findAll({
        where: whereCondition,
        attributes: {
          include: [
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_likes
              WHERE post_likes.postId = posts.id
            )`),
              "likeCount",
            ],
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_comments
              WHERE post_comments.postId = posts.id
            )`),
              "commentCount",
            ],
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_likes
              WHERE post_likes.postId = posts.id
              AND post_likes.userId = ${req.auth ? req.auth.id : 0}
            )`),
              "isLiked",
            ],
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM bookmarks
              WHERE bookmarks.postId = posts.id
              AND bookmarks.userId = ${req.auth ? req.auth.id : 0}
            )`),
              "isBookmarked",
            ],

          ]
        },
        include: [
          {
            model: users,
            as: 'user',
            where: { isProvider: 1 },
            attributes: [
              'id', 'name', 'profileImage',
              [
                db.sequelize.literal(`(
                SELECT IFNULL(ROUND(AVG(rating),1),0)
                FROM rating
                WHERE rating.providerId = user.id
              )`),
                "providerAvgRating"
              ],
              [
                db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM rating
              WHERE rating.providerId = user.id
            )`),
                "totalReview",
              ],
            ]
          },
          {
            model: post_media,
            as: "postMedia",
            attributes: ["id", "mediaUrl", "type", "thumbnail"],
            required: false,
          },
          {
            model: services_categories,
            as: 'category',
            attributes: ["id", "categoryName", "image"],
            required: false,
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      // ✅ Save search appearances if searchKey is present
      if (searchKey.trim() && findPosts && findPosts.length > 0) {
        const searchAppearancesData = findPosts.map(post => {
          return {
            postId: post.id,
            providerId: post.user ? post.user.id : post.userId,
            searchKey: searchKey.trim()
          };
        });
        await search_appearances.bulkCreate(searchAppearancesData).catch(e => console.error("Error saving search appearances:", e));
      }

      return helper.success(res, 'Home', {
        posts: findPosts,
        pagination: {
          page,
          limit,
          searchKey,
          hasNextPage: findPosts.length === limit
        }
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  filterPosts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const category_id = req.query.category_id;
      const distance = req.query.distance; // radius in km
      const rating = req.query.rating;
      const latitude = req.query.latitude;
      const longitude = req.query.longitude;

      let whereCondition = {
        status: 'active',
        type: 'publish',
      };

      if (req.auth) {
        whereCondition.userId = { [Op.ne]: req.auth.id };
      }

      if (category_id) {
        whereCondition.categoryId = category_id;
      }

      let distanceQuery = null;
      let havingCondition = [];

      if (latitude && longitude && distance) {
        distanceQuery = `
        (
          6371 * acos(
            cos(radians(${latitude}))
            * cos(radians(posts.latitude))
            * cos(radians(posts.longitude) - radians(${longitude}))
            + sin(radians(${latitude}))
            * sin(radians(posts.latitude))
          )
        )
      `;
        havingCondition.push(`distance <= ${distance}`);
      }

      if (rating) {
        havingCondition.push(`\`user.providerAvgRating\` >= ${rating}`);
      }

      let findPosts = await posts.findAll({
        where: whereCondition,
        attributes: {
          include: [
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_likes
              WHERE post_likes.postId = posts.id
            )`),
              "likeCount",
            ],
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_comments
              WHERE post_comments.postId = posts.id
            )`),
              "commentCount",
            ],
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_likes
              WHERE post_likes.postId = posts.id
              AND post_likes.userId = ${req.auth ? req.auth.id : 0}
            )`),
              "isLiked",
            ],
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM bookmarks
              WHERE bookmarks.postId = posts.id
              AND bookmarks.userId = ${req.auth ? req.auth.id : 0}
            )`),
              "isBookmarked",
            ],
            ...(distanceQuery ? [
              [db.sequelize.literal(distanceQuery), "distance"]
            ] : []),
          ]
        },
        include: [
          {
            model: users,
            as: 'user',
            where: { isProvider: 1 },
            attributes: [
              'id', 'name', 'profileImage',
              [
                db.sequelize.literal(`(
                SELECT IFNULL(ROUND(AVG(rating),1),0)
                FROM rating
                WHERE rating.providerId = user.id
              )`),
                "providerAvgRating"
              ],
              [
                db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM rating
              WHERE rating.providerId = user.id
            )`),
                "totalReview",
              ],
            ]
          },
          {
            model: post_media,
            as: "postMedia",
            attributes: ["id", "mediaUrl", "type"],
            required: false,
          },
          {
            model: services_categories,
            as: 'category',
            attributes: ["id", "categoryName", "image"],
            required: false,
          }
        ],
        having: havingCondition.length > 0 ? db.sequelize.literal(havingCondition.join(' AND ')) : undefined,
        order: distanceQuery
          ? [[db.sequelize.literal("distance"), "ASC"]]
          : [['createdAt', 'DESC']],
        limit,
        offset
      });

      return helper.success(res, 'Filtered posts fetched', {
        posts: findPosts,
        pagination: {
          page,
          limit,
          hasNextPage: findPosts.length === limit
        }
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  followUser: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        followingId: 'required'
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { followingId } = req.body;
      const followerId = req.auth.id;

      if (String(followerId) === String(followingId)) {
        return helper.failed(res, 'You cannot follow yourself');
      }

      const targetUser = await users.findOne({
        where: { id: followingId }
      });

      if (!targetUser) {
        return helper.failed(res, 'User not found');
      }

      const existingFollow = await followers.findOne({
        where: {
          followerId,
          followingId
        }
      });

      // ==========================
      // UNFOLLOW
      // ==========================
      if (existingFollow) {
        await existingFollow.destroy();

        return helper.success(res, 'Unfollowed successfully', {
          isFollowing: false
        });
      }

      // ==========================
      // FOLLOW
      // ==========================
      await followers.create({
        followerId,
        followingId
      });

      await notifications.create({
        userId: followingId,
        senderId: followerId,
        title: 'New Follower',
        message: `${req.auth.name} started following you`,
        type: 'follow'
      });

      return helper.success(res, 'Followed successfully', {
        isFollowing: true
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  getFollowers: async (req, res) => {
    try {
      const userId = req.query.userId || req.auth.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const searchKey = req.query.searchKey || "";

      let followerWhere = null;
      if (searchKey.trim()) {
        followerWhere = {
          [Op.or]: [
            { name: { [Op.like]: `%${searchKey}%` } },
            { userName: { [Op.like]: `%${searchKey}%` } }
          ]
        };
      }

      let findFollowers = await followers.findAll({
        where: { followingId: userId },
        include: [
          {
            model: users,
            as: 'follower',
            ...(followerWhere && { where: followerWhere }),
            attributes: [
              'id',
              'name',
              'userName',
              'profileImage',
              [
                db.sequelize.literal(`(
                SELECT COUNT(*)
                FROM followers f
                WHERE f.followerId = ${req.auth.id}
                AND f.followingId = follower.id
              )`),
                'isFollow'
              ]
            ]
          }
        ],
        limit,
        offset
      });

      return helper.success(res, 'Followers fetched', {
        data: findFollowers,
        pagination: {
          page,
          limit,
          searchKey,
          hasNextPage: findFollowers.length === limit
        }
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },
  getFollowing: async (req, res) => {
    try {
      const userId = req.query.userId || req.auth.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const searchKey = req.query.searchKey || "";

      let followingWhere = null;
      if (searchKey.trim()) {
        followingWhere = {
          [Op.or]: [
            { name: { [Op.like]: `%${searchKey}%` } },
            { userName: { [Op.like]: `%${searchKey}%` } }
          ]
        };
      }

      let findFollowing = await followers.findAll({
        where: { followerId: userId },
        include: [
          {
            model: users,
            as: 'following',
            ...(followingWhere && { where: followingWhere }),
            attributes: [
              'id',
              'name',
              'userName',
              'profileImage',
              [
                db.sequelize.literal(`(
                SELECT COUNT(*)
                FROM followers f
                WHERE f.followerId = ${req.auth.id}
                AND f.followingId = following.id
              )`),
                'isFollow'
              ]
            ]
          }
        ],
        limit,
        offset
      });

      return helper.success(res, 'Following fetched', {
        data: findFollowing,
        pagination: {
          page,
          limit,
          searchKey,
          hasNextPage: findFollowing.length === limit
        }
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },
  walletDetails: async (req, res) => {
    try {
      const userId = req.auth.id;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const userWallet = await users.findOne({
        where: { id: userId },
        attributes: [
          'id',
          'walletAmount',
          'totalEarning',
          'pendingAmount',
          'withdrawnAmount'
        ]
      });

      if (!userWallet) {
        return helper.failed(res, 'User not found');
      }

      const [pendingResult] = await db.sequelize.query(`
        SELECT COALESCE(SUM(
          COALESCE(p.providerAmount, ROUND(COALESCE(b.amount, b.counterPrice, 0) - ((COALESCE(b.amount, b.counterPrice, 0) * :adminCommission) / 100), 2))
        ), 0) as totalPending
        FROM bookings b
        LEFT JOIN payments p ON p.bookingId = b.id
        WHERE b.providerId = :userId 
          AND (b.paymentStatus = 'paid' OR b.paymentStatus = 'success' OR p.paymentStatus = 'success')
          AND b.bookingStatus NOT IN ('completed', 'cancelled', 'reject')
      `, {
        replacements: { userId, adminCommission: parseFloat(process.env.ADMIN_COMMISSION || 15) },
        type: db.sequelize.QueryTypes.SELECT
      });

      const currentPendingAmount = (parseFloat(pendingResult?.totalPending) || 0).toFixed(2);
      if (userWallet.pendingAmount !== currentPendingAmount) {
        await userWallet.update({ pendingAmount: currentPendingAmount });
      }

      const baseQuery = `
        SELECT CONCAT('wt_', id) as id, COALESCE(description, 'Wallet Top-up') as title, amount, type, status, createdAt as date
        FROM wallet_transactions 
        WHERE userId = :userId AND status = 'completed'

        UNION ALL

        SELECT CONCAT('pm_', p.id) as id, CONCAT('Payment · ', u.name) as title, p.amount, 'debit' as type, 'completed' as status, p.createdAt as date
        FROM payments p
        JOIN bookings b ON p.bookingId = b.id
        JOIN users u ON b.providerId = u.id
        WHERE p.userId = :userId AND p.paymentStatus = 'success'

        UNION ALL

        SELECT CONCAT('pr_', p.id) as id, 'Job payment received' as title, p.providerAmount as amount, 'credit' as type, 'completed' as status, p.createdAt as date
        FROM payments p
        JOIN bookings b ON p.bookingId = b.id
        WHERE b.providerId = :userId AND p.paymentStatus = 'success'

        UNION ALL

        SELECT CONCAT('bk_', b.id) as id, 'Job payment received' as title, 
          ROUND(COALESCE(b.amount, b.counterPrice, 0) - ((COALESCE(b.amount, b.counterPrice, 0) * 15) / 100), 2) as amount, 
          'credit' as type, 'completed' as status, COALESCE(b.updatedAt, b.createdAt) as date
        FROM bookings b
        LEFT JOIN payments p ON p.bookingId = b.id
        WHERE b.providerId = :userId AND b.bookingStatus = 'completed' AND (b.paymentStatus = 'paid' OR b.paymentStatus = 'success') AND p.id IS NULL

        UNION ALL

        SELECT CONCAT('wd_', w.id) as id, IF(w.status='pending', 'Payout to bank (Pending)', 'Payout to bank') as title, w.amount, 'debit' as type, w.status as status, w.createdAt as date
        FROM withdrawal_requests w
        WHERE w.providerId = :userId AND w.status IN ('pending', 'approved')
      `;

      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as transactions`;

      const [countResult] = await db.sequelize.query(countQuery, {
        replacements: { userId },
        type: db.sequelize.QueryTypes.SELECT
      });

      const count = parseInt(countResult.total) || 0;

      const paginatedTransactions = await db.sequelize.query(`
        SELECT * FROM (${baseQuery}) as transactions
        ORDER BY date DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { userId, limit, offset },
        type: db.sequelize.QueryTypes.SELECT
      });

      const moment = require('moment');
      const lastMonthStart = moment().subtract(1, 'month').startOf('month').toDate();
      const lastMonthEnd = moment().subtract(1, 'month').endOf('month').toDate();
      const fiveWeeksAgo = moment().subtract(4, 'weeks').startOf('isoWeek').toDate();
      const fromDate = lastMonthStart < fiveWeeksAgo ? lastMonthStart : fiveWeeksAgo;

      const earningsQuery = `
        SELECT amount, date FROM (
          SELECT p.providerAmount as amount, p.createdAt as date
          FROM payments p
          JOIN bookings b ON p.bookingId = b.id
          WHERE b.providerId = :userId AND p.paymentStatus = 'success'

          UNION ALL

          SELECT ROUND(COALESCE(b.amount, b.counterPrice, 0) - ((COALESCE(b.amount, b.counterPrice, 0) * 15) / 100), 2) as amount, COALESCE(b.updatedAt, b.createdAt) as date
          FROM bookings b
          LEFT JOIN payments p ON p.bookingId = b.id
          WHERE b.providerId = :userId AND b.bookingStatus = 'completed' AND (b.paymentStatus = 'paid' OR b.paymentStatus = 'success') AND p.id IS NULL

          UNION ALL

          SELECT wt.amount as amount, wt.createdAt as date
          FROM wallet_transactions wt
          WHERE wt.userId = :userId AND wt.status = 'completed' AND wt.type = 'credit'
            AND (wt.description IS NULL OR wt.description NOT LIKE '%Top-up%')
        ) as earnings
        WHERE date >= :fromDate
      `;

      const earningsRecords = await db.sequelize.query(earningsQuery, {
        replacements: { userId, fromDate },
        type: db.sequelize.QueryTypes.SELECT
      });

      let lastMonthEarning = 0;
      let weeklyEarnings = [
        { label: 'W1', earning: 0, amount: '0.00' },
        { label: 'W2', earning: 0, amount: '0.00' },
        { label: 'W3', earning: 0, amount: '0.00' },
        { label: 'W4', earning: 0, amount: '0.00' },
        { label: 'W5', earning: 0, amount: '0.00' }
      ];

      earningsRecords.forEach(record => {
        const itemDate = moment(record.date);
        const val = parseFloat(record.amount) || 0;

        if (itemDate.isBetween(lastMonthStart, lastMonthEnd, null, '[]')) {
          lastMonthEarning += val;
        }

        const diffWeeks = moment().startOf('isoWeek').diff(itemDate.clone().startOf('isoWeek'), 'weeks');
        if (diffWeeks >= 0 && diffWeeks <= 4) {
          const index = 4 - diffWeeks;
          weeklyEarnings[index].earning += val;
        }
      });

      weeklyEarnings.forEach(w => {
        w.earning = parseFloat(w.earning.toFixed(2));
        w.amount = w.earning.toFixed(2);
      });

      return helper.success(res, 'Wallet details fetched', {
        wallet: {
          id: userWallet.id,
          walletAmount: userWallet.walletAmount,
          totalEarning: userWallet.totalEarning,
          pendingAmount: currentPendingAmount,
          withdrawnAmount: userWallet.withdrawnAmount,
          lastMonthEarning: lastMonthEarning.toFixed(2),
          weeklyEarnings: weeklyEarnings
        },
        lastMonthEarning: lastMonthEarning.toFixed(2),
        weeklyEarnings: weeklyEarnings,
        transactions: paginatedTransactions,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
          hasNextPage: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },



  updateLocation: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        latitude: 'required',
        longitude: 'required',
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { latitude, longitude } = req.body;
      const userId = req.auth.id;

      await users.update(
        { latitude, longitude },
        { where: { id: userId } }
      );

      let find = await users.findByPk(userId, {
        attributes: ['id', 'latitude', 'longitude']
      });

      return helper.success(res, 'Location updated successfully', { location: find });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },
  getLocation: async (req, res) => {
    try {
      const userId = req.query.userId || req.auth.id;

      const user = await users.findOne({
        where: { id: userId },
        attributes: ['id', 'latitude', 'longitude']
      });

      if (!user) {
        return helper.failed(res, 'User not found');
      }

      return helper.success(res, 'Location fetched successfully', {
        user
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  addBankDetails: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        bankName: 'required',
        accountHolderName: 'required',
        accountNumber: 'required',
        routingNumber: 'required'
      });
      const matched = await v.check();
      if (!matched) {
        return helper.failed(res, v.errors);
      }

      const { bankName, accountHolderName, accountNumber, routingNumber } = req.body;
      const userId = req.auth.id;

      const bankId = req.body.bankId || req.body.id;

      let bankAccount;
      if (bankId) {
        bankAccount = await bank_accounts.findOne({ where: { id: bankId, userId } });
        if (!bankAccount) {
          return helper.failed(res, "Bank account not found");
        }
        await bankAccount.update({
          bankName,
          accountHolderName,
          accountNumber,
          routingNumber
        });
        return helper.success(res, "Bank details updated successfully", bankAccount);
      }

      // Check if duplicate account number already exists for this user
      const existing = await bank_accounts.findOne({ where: { userId, accountNumber } });
      if (existing) {
        return helper.failed(res, "A bank account with this account number already exists");
      }

      bankAccount = await bank_accounts.create({
        userId,
        bankName,
        accountHolderName,
        accountNumber,
        routingNumber
      });

      return helper.success(res, "Bank details added successfully", bankAccount);
    } catch (error) {
      console.log("addBankDetails error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

  getBankList: async (req, res) => {
    try {
      const userId = req.auth.id;
      const accounts = await bank_accounts.findAll({
        where: { userId },
        attributes: ['id', 'bankName', 'accountHolderName', 'accountNumber', 'routingNumber', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      return helper.success(res, "Bank accounts fetched successfully", accounts);
    } catch (error) {
      console.log("getBankAccounts error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

  deleteBankAccount: async (req, res) => {
    try {
      const userId = req.auth.id;
      const bankId = req.params.bankId;

      if (!bankId) {
        return helper.failed(res, "Bank ID is required");
      }

      const bankAccount = await bank_accounts.findOne({
        where: { id: bankId, userId }
      });

      if (!bankAccount) {
        return helper.failed(res, "Bank account not found or not authorized");
      }

      await bankAccount.destroy();

      return helper.success(res, "Bank account deleted successfully");
    } catch (error) {
      console.log("deleteBankAccount error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

};
