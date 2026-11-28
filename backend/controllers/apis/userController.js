const envfile = process.env;
const crypto = require('crypto');
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op, fn, col } = require('sequelize');
const db = require('../../models');
const { users, services, bookings, posts, followers, notifications, post_media, services_categories, portfolio_images, wallet_transactions, search_appearances, bank_accounts, payments, withdrawal_requests, events } = db;

module.exports = {

  home: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const searchKey = req.query.searchKey || "";
      const categoryId = req.query.categoryId;

      let whereCondition = {
        status: 'active',
        type: 'publish',
      };

      const currentUserId = (req.auth && req.auth.id) || (req.user && req.user.id) || 0;

      if (currentUserId > 0) {
        whereCondition.userId = { [Op.ne]: currentUserId };
      }

      if (categoryId) {
        whereCondition.categoryId = categoryId;
      }

      // ==========================================
      // NEARBY CHECK (users.latitude, users.longitude, 100 miles)
      // ==========================================
      let reqLat = req.query.latitude ? parseFloat(req.query.latitude) : null;
      let reqLng = req.query.longitude ? parseFloat(req.query.longitude) : null;
      const maxDistanceMiles = req.query.radius ? parseFloat(req.query.radius) : (req.query.distance ? parseFloat(req.query.distance) : 100);

      // If coordinates not sent in query, fetch from authenticated user's record
      if ((!reqLat || !reqLng) && currentUserId > 0) {
        const currentUser = await users.findOne({
          where: { id: currentUserId },
          attributes: ['latitude', 'longitude']
        });
        if (currentUser && currentUser.latitude && currentUser.longitude) {
          reqLat = parseFloat(currentUser.latitude);
          reqLng = parseFloat(currentUser.longitude);
        }
      }

      const hasCoordinates = reqLat !== null && reqLng !== null && !isNaN(reqLat) && !isNaN(reqLng);
      let nearbyProviderMap = {};

      if (hasCoordinates) {
        // Haversine formula in miles (using Earth radius = 3959 miles) on users table
        const distanceFormula = `
          (
            3959 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${reqLat}))
                * cos(radians(users.latitude))
                * cos(radians(users.longitude) - radians(${reqLng}))
                + sin(radians(${reqLat}))
                * sin(radians(users.latitude))
              ))
            )
          )
        `;

        const nearbyProviders = await users.findAll({
          where: {
            isProvider: 1,
            status: 'active',
            latitude: { [Op.ne]: null },
            longitude: { [Op.ne]: null },
            [Op.and]: db.sequelize.where(db.sequelize.literal(distanceFormula), '<=', maxDistanceMiles)
          },
          attributes: [
            'id',
            [db.sequelize.literal(distanceFormula), 'distanceMiles']
          ],
          raw: true
        });

        nearbyProviders.forEach(p => {
          nearbyProviderMap[p.id] = Math.round(parseFloat(p.distanceMiles) * 100) / 100;
        });

        const nearbyProviderIds = Object.keys(nearbyProviderMap);

        // If no providers are within 100 miles, return empty list
        if (nearbyProviderIds.length === 0) {
          return helper.success(res, 'Home', {
            posts: [],
            pagination: {
              page,
              limit,
              searchKey,
              radiusMiles: maxDistanceMiles,
              hasNextPage: false
            }
          });
        }

        whereCondition.userId = currentUserId > 0
          ? { [Op.in]: nearbyProviderIds, [Op.ne]: currentUserId }
          : { [Op.in]: nearbyProviderIds };
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
              AND post_likes.userId = ${currentUserId}
            )`),
              "isLiked",
            ],
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM bookmarks
              WHERE bookmarks.postId = posts.id
              AND bookmarks.userId = ${currentUserId}
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
              'id', 'name', 'profileImage', 'latitude', 'longitude',
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

      // Format posts and attach distance
      let formattedPosts = findPosts.map(post => {
        const postJson = post.toJSON();
        const providerId = postJson.user ? postJson.user.id : postJson.userId;
        const dist = hasCoordinates && nearbyProviderMap[providerId] !== undefined
          ? nearbyProviderMap[providerId]
          : null;

        postJson.distance = dist;
        postJson.distanceUnit = 'miles';

        if (postJson.user) {
          postJson.user.distance = dist;
          postJson.user.distanceUnit = 'miles';
        }

        return postJson;
      });

      // If user explicitly asks for sorting by distance/nearby
      if (req.query.sortBy === 'distance' || req.query.sortBy === 'nearby') {
        formattedPosts.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }

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
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          searchKey,
          radiusMiles: maxDistanceMiles,
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
          AND NOT EXISTS (
            SELECT 1 FROM wallet_transactions wt 
            WHERE wt.userId = p.userId 
              AND wt.type = 'debit'
              AND (wt.referenceId = p.transactionId OR wt.referenceId = CONVERT(p.bookingId, CHAR) COLLATE utf8mb4_unicode_520_ci)
          )

        UNION ALL

        SELECT CONCAT('pr_', p.id) as id, 'Job payment received' as title, p.providerAmount as amount, 'credit' as type, 'completed' as status, p.createdAt as date
        FROM payments p
        JOIN bookings b ON p.bookingId = b.id
        WHERE b.providerId = :userId AND p.paymentStatus = 'success'
          AND b.bookingStatus = 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM wallet_transactions wt 
            WHERE wt.userId = b.providerId 
              AND wt.type = 'credit'
              AND (wt.referenceId = CONVERT(b.id, CHAR) COLLATE utf8mb4_unicode_520_ci OR wt.referenceId = p.transactionId)
          )

        UNION ALL

        SELECT CONCAT('bk_', b.id) as id, 'Job payment received' as title, 
          ROUND(COALESCE(b.amount, b.counterPrice, 0) - ((COALESCE(b.amount, b.counterPrice, 0) * 15) / 100), 2) as amount, 
          'credit' as type, 'completed' as status, COALESCE(b.updatedAt, b.createdAt) as date
        FROM bookings b
        LEFT JOIN payments p ON p.bookingId = b.id
        WHERE b.providerId = :userId AND b.bookingStatus = 'completed' AND (b.paymentStatus = 'paid' OR b.paymentStatus = 'success') AND p.id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM wallet_transactions wt 
            WHERE wt.userId = b.providerId 
              AND wt.type = 'credit'
              AND wt.referenceId = CONVERT(b.id, CHAR) COLLATE utf8mb4_unicode_520_ci
          )

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
            AND b.bookingStatus = 'completed'
            AND NOT EXISTS (
              SELECT 1 FROM wallet_transactions wt 
              WHERE wt.userId = b.providerId 
                AND wt.type = 'credit'
                AND (wt.referenceId = CONVERT(b.id, CHAR) COLLATE utf8mb4_unicode_520_ci OR wt.referenceId = p.transactionId)
            )

          UNION ALL

          SELECT ROUND(COALESCE(b.amount, b.counterPrice, 0) - ((COALESCE(b.amount, b.counterPrice, 0) * 15) / 100), 2) as amount, COALESCE(b.updatedAt, b.createdAt) as date
          FROM bookings b
          LEFT JOIN payments p ON p.bookingId = b.id
          WHERE b.providerId = :userId AND b.bookingStatus = 'completed' AND (b.paymentStatus = 'paid' OR b.paymentStatus = 'success') AND p.id IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM wallet_transactions wt 
              WHERE wt.userId = b.providerId 
                AND wt.type = 'credit'
                AND wt.referenceId = CONVERT(b.id, CHAR) COLLATE utf8mb4_unicode_520_ci
            )

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

  /**
   * Global Search API - Searches posts, providers/users, categories, and live events
   * Accessible by both guests and authenticated users
   */
  search: async (req, res) => {
    try {
      const searchKey = (req.query.searchKey || req.query.q || req.query.query || req.query.search || (req.body && (req.body.searchKey || req.body.q || req.body.query)) || "").trim();
      const type = (req.query.type || (req.body && req.body.type) || "all").toLowerCase();
      const page = parseInt(req.query.page || (req.body && req.body.page)) || 1;
      const limit = parseInt(req.query.limit || (req.body && req.body.limit)) || 20;
      const offset = (page - 1) * limit;
      const currentUserId = req.auth ? req.auth.id : (req.user ? req.user.id : 0);

      let results = {};

      // 1. Search Posts
      if (type === 'all' || type === 'posts') {
        let postWhere = {
          status: 'active',
          type: 'publish'
        };

        if (searchKey) {
          postWhere[Op.or] = [
            { caption: { [Op.like]: `%${searchKey}%` } },
            { hashtags: { [Op.like]: `%${searchKey}%` } }
          ];
        }

        const { count: postCount, rows: foundPosts } = await posts.findAndCountAll({
          where: postWhere,
          attributes: {
            include: [
              [
                db.sequelize.literal(`(
                  SELECT COUNT(*) FROM post_likes WHERE post_likes.postId = posts.id
                )`),
                "likeCount"
              ],
              [
                db.sequelize.literal(`(
                  SELECT COUNT(*) FROM post_comments WHERE post_comments.postId = posts.id
                )`),
                "commentCount"
              ],
              [
                db.sequelize.literal(`(
                  SELECT COUNT(*) FROM post_likes WHERE post_likes.postId = posts.id AND post_likes.userId = ${currentUserId}
                )`),
                "isLiked"
              ],
              [
                db.sequelize.literal(`(
                  SELECT COUNT(*) FROM bookmarks WHERE bookmarks.postId = posts.id AND bookmarks.userId = ${currentUserId}
                )`),
                "isBookmarked"
              ]
            ]
          },
          include: [
            {
              model: users,
              as: 'user',
              attributes: ['id', 'name', 'userName', 'profileImage', 'isProvider']
            },
            {
              model: post_media,
              as: "postMedia",
              attributes: ["id", "mediaUrl", "type", "thumbnail"],
              required: false
            },
            {
              model: services_categories,
              as: 'category',
              attributes: ["id", "categoryName", "image"],
              required: false
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: type === 'posts' ? limit : 10,
          offset: type === 'posts' ? offset : 0,
          distinct: true
        });

        results.posts = {
          total: postCount,
          data: foundPosts
        };

        // Record search appearances for providers in search results
        if (searchKey && foundPosts && foundPosts.length > 0) {
          const appearances = foundPosts.map(p => ({
            postId: p.id,
            providerId: p.user ? p.user.id : p.userId,
            searchKey: searchKey
          }));
          search_appearances.bulkCreate(appearances).catch(() => {});
        }
      }

      // 2. Search Providers / Users
      if (type === 'all' || type === 'providers' || type === 'users') {
        let userWhere = {
          status: 'active',
          role: 'user'
        };

        if (type === 'providers') {
          userWhere.isProvider = 1;
        }

        if (searchKey) {
          userWhere[Op.or] = [
            { name: { [Op.like]: `%${searchKey}%` } },
            { userName: { [Op.like]: `%${searchKey}%` } },
            { email: { [Op.like]: `%${searchKey}%` } }
          ];
        }

        const { count: userCount, rows: foundUsers } = await users.findAndCountAll({
          where: userWhere,
          attributes: [
            'id', 'name', 'userName', 'email', 'profileImage', 'isProvider', 'providerStatus', 'hourlyPrice', 'latitude', 'longitude',
            [
              db.sequelize.literal(`(
                SELECT IFNULL(ROUND(AVG(rating), 1), 0)
                FROM rating
                WHERE rating.providerId = users.id
              )`),
              'providerAvgRating'
            ],
            [
              db.sequelize.literal(`(
                SELECT COUNT(*)
                FROM rating
                WHERE rating.providerId = users.id
              )`),
              'totalReview'
            ],
            [
              db.sequelize.literal(`(
                SELECT COUNT(*)
                FROM followers
                WHERE followers.followingId = users.id AND followers.followerId = ${currentUserId}
              )`),
              'isFollowing'
            ]
          ],
          limit: (type === 'providers' || type === 'users') ? limit : 10,
          offset: (type === 'providers' || type === 'users') ? offset : 0,
          order: [['name', 'ASC']]
        });

        if (type === 'providers') {
          results.providers = { total: userCount, data: foundUsers };
        } else if (type === 'users') {
          results.users = { total: userCount, data: foundUsers };
        } else {
          results.providers = { total: userCount, data: foundUsers };
        }
      }

      // 3. Search Categories
      if (type === 'all' || type === 'categories') {
        let catWhere = {};
        if (searchKey) {
          catWhere.categoryName = { [Op.like]: `%${searchKey}%` };
        }

        const foundCategories = await services_categories.findAll({
          where: catWhere,
          attributes: ['id', 'categoryName', 'image'],
          limit: type === 'categories' ? limit : 10,
          offset: type === 'categories' ? offset : 0,
          order: [['categoryName', 'ASC']]
        });

        results.categories = {
          total: foundCategories.length,
          data: foundCategories
        };
      }

      // 4. Search Live Events
      if (type === 'all' || type === 'live' || type === 'events') {
        let liveWhere = {
          status: 'start',
          [Op.or]: [{ available: 'everyone' }, { available: null }]
        };

        if (searchKey) {
          liveWhere[Op.and] = [
            {
              [Op.or]: [
                { caption: { [Op.like]: `%${searchKey}%` } },
                { description: { [Op.like]: `%${searchKey}%` } }
              ]
            }
          ];
        }

        const foundEvents = await (db.events || events).findAll({
          where: liveWhere,
          include: [
            {
              model: users,
              as: 'user',
              attributes: ['id', 'name', 'profileImage']
            }
          ],
          limit: (type === 'live' || type === 'events') ? limit : 10,
          offset: (type === 'live' || type === 'events') ? offset : 0,
          order: [['id', 'DESC']]
        });

        results.liveEvents = {
          total: foundEvents.length,
          data: foundEvents
        };
      }

      return helper.success(res, "Search results fetched successfully", {
        searchKey,
        type,
        page,
        limit,
        ...results
      });

    } catch (error) {
      console.log("search error:", error);
      return helper.error(res, "Something went wrong while searching: " + error.message);
    }
  },

  /**
   * Upload or re-upload user driving license (front and back)
   * Resets isApproved to 'Pending', clears any rejection reason, and records timestamp
   */
  uploadLicense: async (req, res) => {
    try {
      const userId = req.auth.id;
      const user = await users.findOne({ where: { id: userId } });
      if (!user) return helper.failed(res, "User not found");

      let licenseFrontUrl = req.body.licenseFront || req.body.license_front || req.body.front || null;
      let licenseBackUrl = req.body.licenseBack || req.body.license_back || req.body.back || null;

      // Handle file uploads (multipart/form-data)
      if (req.files) {
        const frontFile = req.files.licenseFront || req.files.license_front || req.files.front;
        const backFile = req.files.licenseBack || req.files.license_back || req.files.back;

        if (frontFile) {
          licenseFrontUrl = await helper.fileUpload(frontFile, "licenses");
        }
        if (backFile) {
          licenseBackUrl = await helper.fileUpload(backFile, "licenses");
        }
      }

      if (!licenseFrontUrl || !licenseBackUrl) {
        return helper.failed(
          res,
          "Both license front and back images are required (licenseFront and licenseBack)."
        );
      }

      await user.update({
        licenseFront: licenseFrontUrl,
        licenseBack: licenseBackUrl,
        isApproved: 'Pending',
        licenseRejectionReason: null,
        licenseSubmittedAt: new Date()
      });

      // Send push notification confirmation to user
      try {
        if (user.deviceToken) {
          await helper.sendPushNotification({
            token: user.deviceToken,
            title: "License Documents Submitted",
            body: "Your driving license has been submitted and is currently under review.",
            type: "license_verification",
            sender_id: user.id
          });
        }
      } catch (pushErr) {
        console.error("Push notification error on license upload:", pushErr.message);
      }

      return helper.success(res, "License uploaded successfully. Your verification is under review.", {
        userId: user.id,
        isApproved: user.isApproved,
        isVerified: user.isVerified,
        licenseFront: user.licenseFront,
        licenseBack: user.licenseBack,
        licenseRejectionReason: user.licenseRejectionReason,
        licenseSubmittedAt: user.licenseSubmittedAt
      });
    } catch (error) {
      console.error("uploadLicense error:", error);
      return helper.error(res, "Failed to upload license: " + error.message);
    }
  },

  /**
   * Get current user's license verification status and details
   */
  getLicenseStatus: async (req, res) => {
    try {
      const userId = req.auth.id;
      const user = await users.findOne({
        where: { id: userId },
        attributes: [
          'id',
          'name',
          'email',
          'isApproved',
          'isVerified',
          'licenseFront',
          'licenseBack',
          'licenseRejectionReason',
          'licenseSubmittedAt'
        ]
      });
      if (!user) return helper.failed(res, "User not found");

      return helper.success(res, "License verification status retrieved", user);
    } catch (error) {
      console.error("getLicenseStatus error:", error);
      return helper.error(res, "Failed to retrieve license status: " + error.message);
    }
  },

  /**
   * ========================================================
   * FEATURE 1: UPDATE PHONE NUMBER WITH TWO-STEP OTP VERIFICATION
   * ========================================================
   */

  /**
   * Step 1: Send OTP to current registered (old) phone number
   */
  sendOldPhoneOtp: async (req, res) => {
    try {
      const userId = (req.auth && req.auth.id) || (req.user && req.user.id);
      if (!userId) return helper.unauthorized(res, "Authentication required.");

      const user = await users.findOne({ where: { id: userId, deletedAt: null } });
      if (!user) return helper.failed(res, "User not found.");

      if (!user.phone) {
        return helper.failed(res, "No phone number is registered with your account.");
      }

      const phoneVerifications = db.phoneVerifications || db.phone_verifications;
      const now = new Date();

      // Check if an active session exists
      let session = await phoneVerifications.findOne({
        where: {
          userId: user.id,
          step: { [Op.in]: ['old_phone_pending', 'old_phone_verified', 'new_phone_pending'] },
          expiresAt: { [Op.gt]: now }
        }
      });

      // Cooldown check (60 seconds)
      if (session && session.oldOtpLastSentAt && (now.getTime() - new Date(session.oldOtpLastSentAt).getTime()) < 60000) {
        const remainingSec = Math.ceil((60000 - (now.getTime() - new Date(session.oldOtpLastSentAt).getTime())) / 1000);
        return helper.failed(res, `Please wait ${remainingSec} seconds before requesting a new OTP.`);
      }

      // Generate 4-digit OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const sessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes overall
      const sessionToken = crypto.randomBytes(32).toString('hex');

      if (session) {
        await session.update({
          sessionToken,
          step: 'old_phone_pending',
          oldPhone: user.phone,
          oldCountryCode: user.countryCode || '',
          oldOtp: otp,
          oldOtpExpiresAt: otpExpiresAt,
          oldOtpAttempts: 0,
          oldOtpLastSentAt: now,
          newPhone: null,
          newCountryCode: null,
          newOtp: null,
          newOtpExpiresAt: null,
          newOtpAttempts: 0,
          expiresAt: sessionExpiresAt
        });
      } else {
        session = await phoneVerifications.create({
          userId: user.id,
          sessionToken,
          step: 'old_phone_pending',
          oldPhone: user.phone,
          oldCountryCode: user.countryCode || '',
          oldOtp: otp,
          oldOtpExpiresAt: otpExpiresAt,
          oldOtpAttempts: 0,
          oldOtpLastSentAt: now,
          expiresAt: sessionExpiresAt
        });
      }

      // Send OTP via Twilio
      const fullPhone = `${user.countryCode || ''}${user.phone}`;
      await helper.sendPhoneOtp(fullPhone, otp);

      // Mask phone for user response (e.g., +1 ********45)
      const rawPhone = String(user.phone);
      const masked = (user.countryCode ? user.countryCode + ' ' : '') +
        (rawPhone.length > 4 ? rawPhone.slice(0, 2) + '*'.repeat(Math.max(0, rawPhone.length - 4)) + rawPhone.slice(-2) : '****');

      return helper.success(res, "OTP has been sent to your registered phone number.", {
        verificationSessionToken: sessionToken,
        maskedPhone: masked,
        expiresIn: 300,
        step: "old_phone_pending"
      });
    } catch (error) {
      console.error("sendOldPhoneOtp error:", error);
      return helper.error(res, "Failed to send OTP to registered phone number: " + error.message);
    }
  },

  /**
   * Step 1.2: Verify OTP for old phone number
   */
  verifyOldPhoneOtp: async (req, res) => {
    try {
      const userId = (req.auth && req.auth.id) || (req.user && req.user.id);
      if (!userId) return helper.unauthorized(res, "Authentication required.");

      const { otp, verificationSessionToken } = req.body;
      if (!otp) return helper.failed(res, "OTP is required.");
      if (!verificationSessionToken) return helper.failed(res, "Verification session token is required.");

      const phoneVerifications = db.phoneVerifications || db.phone_verifications;
      const session = await phoneVerifications.findOne({
        where: {
          sessionToken: verificationSessionToken,
          userId: userId
        }
      });

      if (!session) {
        return helper.unauthorized(res, "Invalid or expired verification session.");
      }

      if (session.step !== 'old_phone_pending') {
        return helper.failed(res, "Invalid step for this verification session.");
      }

      const now = new Date();
      if (now > new Date(session.expiresAt) || now > new Date(session.oldOtpExpiresAt)) {
        return helper.failed(res, "OTP has expired. Please request a new OTP.");
      }

      // Max attempts check (5 attempts)
      if (session.oldOtpAttempts >= 5) {
        await session.destroy();
        return helper.failed(res, "Too many failed attempts. Please restart phone verification.");
      }

      if (String(session.oldOtp).trim() !== String(otp).trim()) {
        await session.increment('oldOtpAttempts');
        const remaining = 5 - (session.oldOtpAttempts + 1);
        return helper.failed(res, remaining > 0 ? `Incorrect OTP. ${remaining} attempt(s) remaining.` : "Too many failed attempts. Session closed.");
      }

      // Verified successfully! Advance step to old_phone_verified
      await session.update({
        step: 'old_phone_verified',
        oldOtp: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      return helper.success(res, "Old phone number verified successfully. Please enter your new phone number.", {
        verificationSessionToken: session.sessionToken,
        step: "old_phone_verified"
      });
    } catch (error) {
      console.error("verifyOldPhoneOtp error:", error);
      return helper.error(res, "Failed to verify old phone OTP: " + error.message);
    }
  },

  /**
   * Step 2: Send OTP to new phone number
   */
  sendNewPhoneOtp: async (req, res) => {
    try {
      const userId = (req.auth && req.auth.id) || (req.user && req.user.id);
      if (!userId) return helper.unauthorized(res, "Authentication required.");

      const { newPhone, countryCode, verificationSessionToken } = req.body;
      if (!newPhone) return helper.failed(res, "New phone number is required.");
      if (!countryCode) return helper.failed(res, "Country code is required.");
      if (!verificationSessionToken) return helper.failed(res, "Verification session token is required.");

      const cleanPhone = String(newPhone).replace(/[^0-9]/g, '');
      const cleanCountryCode = String(countryCode).trim();

      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        return helper.failed(res, "Please enter a valid phone number (7-15 digits).");
      }

      const phoneVerifications = db.phoneVerifications || db.phone_verifications;
      const session = await phoneVerifications.findOne({
        where: {
          sessionToken: verificationSessionToken,
          userId: userId
        }
      });

      if (!session) {
        return helper.unauthorized(res, "Invalid or expired verification session.");
      }

      if (!['old_phone_verified', 'new_phone_pending'].includes(session.step)) {
        return helper.failed(res, "Please verify your old phone number before entering a new one.");
      }

      const now = new Date();
      if (now > new Date(session.expiresAt)) {
        await session.destroy();
        return helper.failed(res, "Verification session has expired. Please start again.");
      }

      // Ensure new phone is not identical to current phone
      if (session.oldPhone === cleanPhone && session.oldCountryCode === cleanCountryCode) {
        return helper.failed(res, "New phone number cannot be the same as your current registered phone number.");
      }

      // Check uniqueness in users table
      const duplicateUser = await users.findOne({
        where: {
          phone: cleanPhone,
          deletedAt: null,
          id: { [Op.ne]: userId }
        }
      });

      if (duplicateUser) {
        return helper.failed(res, "This phone number is already registered with another account.");
      }

      // Cooldown check (60s)
      if (session.step === 'new_phone_pending' && session.newOtpLastSentAt && (now.getTime() - new Date(session.newOtpLastSentAt).getTime()) < 60000) {
        const remainingSec = Math.ceil((60000 - (now.getTime() - new Date(session.newOtpLastSentAt).getTime())) / 1000);
        return helper.failed(res, `Please wait ${remainingSec} seconds before requesting a new OTP.`);
      }

      // Generate 4-digit OTP for new number
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      await session.update({
        step: 'new_phone_pending',
        newPhone: cleanPhone,
        newCountryCode: cleanCountryCode,
        newOtp: otp,
        newOtpExpiresAt: otpExpiresAt,
        newOtpAttempts: 0,
        newOtpLastSentAt: now,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      // Send OTP to new phone number
      const fullPhone = `${cleanCountryCode}${cleanPhone}`;
      await helper.sendPhoneOtp(fullPhone, otp);

      return helper.success(res, "OTP has been sent to your new phone number.", {
        verificationSessionToken: session.sessionToken,
        expiresIn: 300,
        step: "new_phone_pending"
      });
    } catch (error) {
      console.error("sendNewPhoneOtp error:", error);
      return helper.error(res, "Failed to send OTP to new phone number: " + error.message);
    }
  },

  /**
   * Step 3: Verify OTP for new phone number and update database
   */
  verifyNewPhoneOtp: async (req, res) => {
    try {
      const userId = (req.auth && req.auth.id) || (req.user && req.user.id);
      if (!userId) return helper.unauthorized(res, "Authentication required.");

      const { otp, verificationSessionToken } = req.body;
      if (!otp) return helper.failed(res, "OTP is required.");
      if (!verificationSessionToken) return helper.failed(res, "Verification session token is required.");

      const phoneVerifications = db.phoneVerifications || db.phone_verifications;
      const session = await phoneVerifications.findOne({
        where: {
          sessionToken: verificationSessionToken,
          userId: userId
        }
      });

      if (!session) {
        return helper.unauthorized(res, "Invalid or expired verification session.");
      }

      if (session.step !== 'new_phone_pending') {
        return helper.failed(res, "Invalid step for this verification session.");
      }

      const now = new Date();
      if (now > new Date(session.expiresAt) || now > new Date(session.newOtpExpiresAt)) {
        return helper.failed(res, "OTP has expired. Please request a new OTP.");
      }

      // Max attempts check (5 attempts)
      if (session.newOtpAttempts >= 5) {
        await session.destroy();
        return helper.failed(res, "Too many failed attempts. Please restart phone verification.");
      }

      if (String(session.newOtp).trim() !== String(otp).trim()) {
        await session.increment('newOtpAttempts');
        const remaining = 5 - (session.newOtpAttempts + 1);
        return helper.failed(res, remaining > 0 ? `Incorrect OTP. ${remaining} attempt(s) remaining.` : "Too many failed attempts. Session closed.");
      }

      // Final uniqueness check before mutating user record
      const duplicateUser = await users.findOne({
        where: {
          phone: session.newPhone,
          deletedAt: null,
          id: { [Op.ne]: userId }
        }
      });
      if (duplicateUser) {
        await session.destroy();
        return helper.failed(res, "This phone number is already registered with another account.");
      }

      // Update user's registered phone number & country code
      const user = await users.findOne({ where: { id: userId } });
      if (!user) return helper.failed(res, "User not found.");

      await user.update({
        phone: session.newPhone,
        countryCode: session.newCountryCode,
        otpVerify: 'verified'
      });

      // Invalidate the session
      await session.destroy();

      return helper.success(res, "Phone number updated successfully.", {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode,
        isApproved: user.isApproved,
        isVerified: user.isVerified
      });
    } catch (error) {
      console.error("verifyNewPhoneOtp error:", error);
      return helper.error(res, "Failed to verify new phone OTP: " + error.message);
    }
  },

  /**
   * Resend OTP for old or new phone number with cooldown
   */
  resendPhoneOtp: async (req, res) => {
    try {
      const userId = (req.auth && req.auth.id) || (req.user && req.user.id);
      if (!userId) return helper.unauthorized(res, "Authentication required.");

      const { verificationSessionToken, type } = req.body;
      if (!verificationSessionToken) return helper.failed(res, "Verification session token is required.");

      const phoneVerifications = db.phoneVerifications || db.phone_verifications;
      const session = await phoneVerifications.findOne({
        where: {
          sessionToken: verificationSessionToken,
          userId: userId
        }
      });

      if (!session) {
        return helper.unauthorized(res, "Invalid or expired verification session.");
      }

      const now = new Date();
      if (now > new Date(session.expiresAt)) {
        await session.destroy();
        return helper.failed(res, "Verification session has expired. Please restart.");
      }

      const isNew = type === 'new' || session.step === 'new_phone_pending';
      const lastSent = isNew ? session.newOtpLastSentAt : session.oldOtpLastSentAt;

      // Cooldown check (60s)
      if (lastSent && (now.getTime() - new Date(lastSent).getTime()) < 60000) {
        const remainingSec = Math.ceil((60000 - (now.getTime() - new Date(lastSent).getTime())) / 1000);
        return helper.failed(res, `Please wait ${remainingSec} seconds before requesting a new OTP.`);
      }

      // Generate new 4-digit OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

      if (isNew) {
        if (!session.newPhone) {
          return helper.failed(res, "New phone number is not set. Please provide new phone number first.");
        }
        await session.update({
          newOtp: otp,
          newOtpExpiresAt: otpExpiresAt,
          newOtpAttempts: 0,
          newOtpLastSentAt: now
        });
        const fullPhone = `${session.newCountryCode || ''}${session.newPhone}`;
        await helper.sendPhoneOtp(fullPhone, otp);
        return helper.success(res, "OTP has been resent to your new phone number.", {
          expiresIn: 300,
          step: "new_phone_pending"
        });
      } else {
        await session.update({
          oldOtp: otp,
          oldOtpExpiresAt: otpExpiresAt,
          oldOtpAttempts: 0,
          oldOtpLastSentAt: now
        });
        const fullPhone = `${session.oldCountryCode || ''}${session.oldPhone}`;
        await helper.sendPhoneOtp(fullPhone, otp);
        return helper.success(res, "OTP has been resent to your registered phone number.", {
          expiresIn: 300,
          step: "old_phone_pending"
        });
      }
    } catch (error) {
      console.error("resendPhoneOtp error:", error);
      return helper.error(res, "Failed to resend OTP: " + error.message);
    }
  },

};
