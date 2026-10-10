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

      const baseQuery = `
        SELECT CONCAT('wt_', id) as id, COALESCE(description, 'Wallet Top-up') as title, amount, type, createdAt as date
        FROM wallet_transactions 
        WHERE userId = :userId

        UNION ALL

        SELECT CONCAT('pm_', p.id) as id, CONCAT('Payment · ', u.name) as title, p.amount, 'debit' as type, p.createdAt as date
        FROM payments p
        JOIN bookings b ON p.bookingId = b.id
        JOIN users u ON b.providerId = u.id
        WHERE p.userId = :userId AND p.paymentStatus = 'success'

        UNION ALL

        SELECT CONCAT('pr_', p.id) as id, 'Job payment received' as title, p.providerAmount as amount, 'credit' as type, p.createdAt as date
        FROM payments p
        JOIN bookings b ON p.bookingId = b.id
        WHERE b.providerId = :userId AND p.paymentStatus = 'success'

        UNION ALL

        SELECT CONCAT('wd_', w.id) as id, IF(w.status='pending', 'Payout to bank (Pending)', 'Payout to bank') as title, w.amount, 'debit' as type, w.createdAt as date
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

      return helper.success(res, 'Wallet details fetched', {
        wallet: {
          id: userWallet.id,
          walletAmount: userWallet.walletAmount,
          totalEarning: userWallet.totalEarning,
          pendingAmount: userWallet.pendingAmount,
          withdrawnAmount: userWallet.withdrawnAmount
        },
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

      // Check if user already has a bank account and update it, else create
      let bankAccount = await bank_accounts.findOne({ where: { userId } });

      if (bankAccount) {
        await bankAccount.update({
          bankName,
          accountHolderName,
          accountNumber,
          routingNumber
        });
      } else {
        bankAccount = await bank_accounts.create({
          userId,
          bankName,
          accountHolderName,
          accountNumber,
          routingNumber
        });
      }

      return helper.success(res, "Bank details saved successfully", bankAccount);
    } catch (error) {
      console.log("addBankDetails error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

};
