const envfile = process.env;
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op } = require('sequelize');
const db = require('../../models');
const sequelize = require("sequelize");

const { users, services, services_categories, provider_verifications, bookings, notifications, portfolio_images, user_categories, posts, post_media, profile_views, search_appearances } = db;

users.hasMany(portfolio_images, { foreignKey: 'providerId', as: 'portfolioImages' });
// portfolio_images.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
module.exports = {


  getProviderProfile: async (req, res) => {
    try {
      const providerId = req.query.providerId || req.auth.id;

      if (req.auth && req.auth.id && req.auth.id != providerId) {
        // Save the profile view entry
        await profile_views.create({
          viewById: req.auth.id,
          viewToId: providerId
        });
      }

      const provider = await users.findOne({
        where: {
          id: providerId,
          // isProvider: 1,
        },

        attributes: {
          exclude: [
            "password",
            "resetToken",
            "resetTokenExpiry",
            "fcmToken",
          ],
          include: [

            [
              sequelize.literal(`(
                          SELECT COUNT(*)
                          FROM posts
                          WHERE posts.userId = users.id
                          AND posts.status = 'active'
                          AND posts.type = 'publish'
                        )`),
              "postCount"
            ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM followers
              WHERE followers.followingId = users.id
            )`),
              "followerCount",
            ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM followers
              WHERE followers.followerId = users.id
            )`),
              "followingCount",
            ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM followers
              WHERE followers.followingId = users.id
              AND followers.followerId = ${req.auth ? req.auth.id : 0}
            )`),
              "isFollow",
            ],
            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM bookings
              WHERE bookings.providerId = users.id
            )`),
              "bookingCount",
            ],

            [
              sequelize.literal(`(
              SELECT IFNULL(ROUND(AVG(rating),1),0)
              FROM rating
              WHERE rating.providerId = users.id
            )`),
              "avgRating",
            ],
            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM rating
              WHERE rating.providerId = users.id
            )`),
              "ratingCount",
            ],
          ],
        },

        include: [
          {
            model: portfolio_images,
            as: "portfolioImages",
            attributes: ["id", "imageUrl"],
            required: false,
          },
          {
            model: provider_verifications,
            as: "verifications",
            attributes: [
              "id",
              "documentType",
              "documentImage",
              "verificationStatus",
            ],
            required: false,
          },
        ],
      });

      if (!provider) {
        return helper.failed(res, "Provider not found");
      }

      let categoryData = await user_categories.findAll({
        where: { userId: provider.id },
        attributes: ["id", "categoryId", "isPrimary"],
        include: [
          {
            model: services_categories,
            as: "categories",
            attributes: ["id", "categoryName", "image"]
          }
        ]
      });
      const userPosts = await posts.findAll({
        where: { userId: provider.id, status: 'active', type: 'publish' },
        // attributes: ['id'],
        include: [
          {
            model: post_media,
            as: "postMedia",
            attributes: ["id", "mediaUrl", "type", "thumbnail"],
            required: false,
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const obj = provider.toJSON();
      obj.categories = categoryData;
      obj.posts = userPosts;

      return helper.success(
        res,
        "Provider profile fetched successfully",
        obj
      );
    } catch (error) {
      console.log(error);
      return helper.error(res, "Something went wrong");
    }
  },
  getProvidersList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const Op = db.Sequelize.Op;

      const {
        searchKey,
        minPrice,
        maxPrice,
        minRating,
        categoryIds,
        isAvailable,
        latitude,
        longitude,
        radius
      } = req.query;

      // =========================
      // BASE CONDITION
      // =========================
      let whereCondition = {
        status: 'active',
        role: 'user',
        isProvider: 1,
        providerStatus: "approved"
      };

      // =========================
      // SEARCH FILTER
      // =========================
      if (searchKey?.trim()) {
        whereCondition[Op.or] = [
          { name: { [Op.like]: `%${searchKey}%` } },
          { userName: { [Op.like]: `%${searchKey}%` } },
          { email: { [Op.like]: `%${searchKey}%` } }
        ];
      }

      // =========================
      // PRICE FILTER
      // =========================
      if (minPrice || maxPrice) {
        whereCondition.hourlyPrice = {};
        if (minPrice) whereCondition.hourlyPrice[Op.gte] = Number(minPrice);
        if (maxPrice) whereCondition.hourlyPrice[Op.lte] = Number(maxPrice);
      }

      // =========================
      // AVAILABILITY FILTER
      // =========================
      if (isAvailable === "1") {
        // whereCondition.isOnline = 1; // isOnline column does not exist in users table
      }

      // =========================
      // DISTANCE CALCULATION
      // =========================
      let distanceQuery = null;
      let havingCondition = null;

      if (latitude && longitude && radius) {
        distanceQuery = `
        (
          6371 * acos(
            cos(radians(${latitude}))
            * cos(radians(users.latitude))
            * cos(radians(users.longitude) - radians(${longitude}))
            + sin(radians(${latitude}))
            * sin(radians(users.latitude))
          )
        )
      `;

        havingCondition = db.sequelize.literal(`distance <= ${radius}`);
      }

      // =========================
      // CATEGORY FILTER
      // =========================
      let include = [];

      if (categoryIds) {
        include.push({
          model: db.user_categories,
          as: "userCategories",
          required: true,
          where: {
            categoryId: {
              [Op.in]: Array.isArray(categoryIds)
                ? categoryIds
                : categoryIds.split(',')
            }
          }
        });
      } else {
        include.push({
          model: db.user_categories,
          as: "userCategories",
          required: false
        });
      }

      // =========================
      // MAIN QUERY
      // =========================
      let findProviders = await users.findAll({
        where: whereCondition,

        attributes: [
          'id',
          'bio',
          'about',
          'hourlyPrice',
          'profileImageProvider',
          'name',
          'email',
          'userName',
          'countryCode',
          'phone',

          ...(distanceQuery ? [
            [db.sequelize.literal(distanceQuery), "distance"]
          ] : []),

          [
            db.sequelize.literal(`(
            SELECT IFNULL(ROUND(AVG(rating),1),0)
            FROM rating
            WHERE rating.providerId = users.id
          )`),
            "providerAvgRating"
          ]
        ],

        include,

        group: ['users.id'],

        having: havingCondition || undefined,

        order: distanceQuery
          ? [[db.sequelize.literal("distance"), "ASC"]]
          : [['id', 'DESC']],

        limit,
        offset
      });

      return helper.success(res, 'Providers list fetched successfully', {
        providers: findProviders,
        pagination: {
          page,
          limit,
          searchKey,
          hasNextPage: findProviders.length === limit
        }
      });

    } catch (error) {
      console.log("getProvidersList error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },
  providerDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const findProvider = await users.findOne({
        where: { id, role: 'user', isProvider: 1, providerStatus: "approved" },

        attributes: {
          exclude: ['password', 'fcmToken', 'deviceType', 'socialId', 'loginType', 'resetToken', 'resetTokenExpiry', 'customerId', 'isNotification', 'walletAmount', 'totalEarning', 'pendingAmount', 'withdrawnAmount', 'isWalletFrozen', 'referralCode', 'referredBy', 'admin_commission', 'govt_tax', 'contact_email', 'contact_phone', 'withdrawal_fees', 'country_fees', 'promotional_fee_waivers', 'supported_currencies', 'tax_rules', 'payout_providers', 'otp', 'otpVerify', 'isProfileComplete', 'createdAt', 'updatedAt', 'deletedAt'],
          include: [
            [
              db.sequelize.literal(`(
              SELECT IFNULL(ROUND(AVG(rating),1),0)
              FROM rating
              WHERE rating.providerId = users.id
            )`),
              "avgRating",
            ],
            [
              db.sequelize.literal(`(
              SELECT COUNT(*)
              FROM rating
              WHERE rating.providerId = users.id
            )`),
              "ratingCount",
            ],


          ],
        },
        include: [
          {
            model: db.user_categories,
            as: "userCategories",
            required: false,
            include: [
              {
                model: services_categories,
                as: "category",
                attributes: ["id", "categoryName", "image"],
              },
            ],
          },
          {
            model: portfolio_images,
            as: "portfolioImages",
            attributes: ["id", "imageUrl"],
            required: false,
          },
        ]
      });
      if (!findProvider) {
        return helper.failed(res, "Provider not found");
      }
      return helper.success(res, "Provider detail fetched successfully", findProvider);
    } catch (error) {
      console.log("providerDetail error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

  addProviderCategory: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        categoryName: 'required',
        // description: 'required',
      });
      const matched = await v.check();
      if (!matched) {
        return helper.failed(res, v.errors);
      }

      const { categoryName, description } = req.body;
      const userId = req.auth.id;

      let image = null;
      if (req.files && req.files.image) {
        image = await helper.fileUpload(req.files.image, 'categories');
      }

      const newCategory = await services_categories.create({
        categoryName,
        description: description || "",
        approvalStatus: 'pending',
        userId: userId,
        status: 0,
        image
      });

      // Category is created as pending. User will select it from the list after it is approved by the admin.

      return helper.success(res, "Category added successfully. Waiting for admin approval.", newCategory);
    } catch (error) {
      console.log("addProviderCategory error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

  getProviderInsights: async (req, res) => {
    try {
      const providerId = req.auth.id;

      // 1. Total Profile Views
      const totalViews = await profile_views.count({
        where: { viewToId: providerId }
      });

      // 2. Fetch all views from the last 5 weeks
      const moment = require('moment');
      const fiveWeeksAgo = moment().subtract(5, 'weeks').startOf('isoWeek').toDate();

      const recentViews = await profile_views.findAll({
        where: {
          viewToId: providerId,
          createdAt: {
            [Op.gte]: fiveWeeksAgo
          }
        },
        attributes: ['createdAt']
      });

      // Initialize the weekly counts for W1 to W5
      // W5 = current week, W4 = last week, ..., W1 = 4 weeks ago
      let weeklyData = [
        { label: 'W1', count: 0 },
        { label: 'W2', count: 0 },
        { label: 'W3', count: 0 },
        { label: 'W4', count: 0 },
        { label: 'W5', count: 0 }
      ];
      
      recentViews.forEach(view => {
        const viewMoment = moment(view.createdAt);
        // Calculate the difference in weeks from the current week
        const diffWeeks = moment().startOf('isoWeek').diff(viewMoment.startOf('isoWeek'), 'weeks');
        
        // diffWeeks: 0 = W5, 1 = W4, 2 = W3, 3 = W2, 4 = W1
        if (diffWeeks >= 0 && diffWeeks <= 4) {
          const index = 4 - diffWeeks;
          weeklyData[index].count++;
        }
      });

      // Search Hits
      const searchHitsCount = await search_appearances.count({
        where: { providerId: providerId }
      });

      const recentSearchHits = await search_appearances.findAll({
        where: {
          providerId: providerId,
          createdAt: {
            [Op.gte]: fiveWeeksAgo
          }
        },
        attributes: ['createdAt']
      });

      let searchChartData = [
        { label: 'W1', count: 0 },
        { label: 'W2', count: 0 },
        { label: 'W3', count: 0 },
        { label: 'W4', count: 0 },
        { label: 'W5', count: 0 }
      ];

      recentSearchHits.forEach(hit => {
        const hitMoment = moment(hit.createdAt);
        const diffWeeks = moment().startOf('isoWeek').diff(hitMoment.startOf('isoWeek'), 'weeks');
        if (diffWeeks >= 0 && diffWeeks <= 4) {
          const index = 4 - diffWeeks;
          searchChartData[index].count++;
        }
      });

      return helper.success(res, "Insights fetched successfully", {
        totalViews: totalViews,
        searchHits: searchHitsCount,
        chartData: weeklyData,
        searchChartData: searchChartData
      });

    } catch (error) {
      console.log("getProviderInsights error:", error);
      return helper.error(res, 'Something went wrong');
    }
  },

};
