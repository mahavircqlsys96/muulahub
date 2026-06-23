const envfile = process.env;
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op } = require('sequelize');
const db = require('../../models');
const sequelize = require("sequelize");

const { users, services, services_categories, provider_verifications, bookings, notifications, portfolio_images } = db;

users.hasMany(portfolio_images, { foreignKey: 'providerId', as: 'portfolioImages' });
// portfolio_images.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
module.exports = {


  getProviderProfile: async (req, res) => {
    try {
      const providerId = req.query.providerId || req.auth.id;

      const provider = await users.findOne({
        where: {
          id: providerId,
          isProvider: 1,
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
            )`),
              "postCount",
            ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM followers
              WHERE followers.followingId = users.id
            )`),
              "followersCount",
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
              FROM bookings
              WHERE bookings.providerId = users.id
            )`),
              "bookingCount",
            ],

            [
              sequelize.literal(`0`),
              "avgRating",
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

      return helper.success(
        res,
        "Provider profile fetched successfully",
        provider
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
          model: db.provider_categories,
          as: "providerCategories",
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
          model: db.provider_categories,
          as: "providerCategories",
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


          ],
        },
        include: [
          {
            model: db.provider_categories,
            as: "providerCategories",
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



};
