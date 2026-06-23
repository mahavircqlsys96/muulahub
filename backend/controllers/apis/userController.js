const envfile = process.env;
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op, fn, col } = require('sequelize');
const db = require('../../models');
const { users, services, bookings, posts, followers, notifications, post_media, services_categories, portfolio_images, wallet_transactions } = db;

module.exports = {

  home: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const searchKey = req.query.searchKey || "";

      let whereCondition = {
        status: 'active',
      };

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
              db.sequelize.literal(`0`),
              "isBookmarked",
            ]
          ]
        },
        include: [
          {
            model: users,
            as: 'user',
            attributes: [
              'id', 'name', 'profileImage',
              [
                db.sequelize.literal(`(
                SELECT IFNULL(ROUND(AVG(rating),1),0)
                FROM rating
                WHERE rating.providerId = user.id
              )`),
                "providerAvgRating"
              ]
            ]
          },
          {
            model: post_media,
            as: "postMedia",
            attributes: ["id", "mediaUrl"],
            required: false,
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

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

      const { count, rows } = await followers.findAndCountAll({
        where: { followingId: userId },
        include: [
          {
            model: users,
            as: 'follower',
            attributes: [
              'id',
              'name',
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
        total: count,
        page,
        limit,
        data: rows
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

      const { count, rows } = await followers.findAndCountAll({
        where: { followerId: userId },
        include: [
          {
            model: users,
            as: 'following',
            attributes: [
              'id',
              'name',
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
        total: count,
        page,
        limit,
        data: rows
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

      const { count, rows } = await wallet_transactions.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return helper.success(res, 'Wallet details fetched', {
        wallet: {
          id: userWallet.id,
          walletAmount: userWallet.walletAmount,
          totalEarning: userWallet.totalEarning,
          pendingAmount: userWallet.pendingAmount,
          withdrawnAmount: userWallet.withdrawnAmount
        },

        transactions: rows,

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
  


};
