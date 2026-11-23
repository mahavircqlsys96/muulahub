const envfile = process.env;
const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op } = require('sequelize');
const db = require('../../models');
const sequelize = require("sequelize");

const { users, services, services_categories, provider_verifications, bookings, notifications, portfolio_images, user_categories, posts, post_media, profile_views, search_appearances, events } = db;

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
            "deviceToken",
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

      const completedLiveEvents = await events.findAll({
        where: {
          userId: provider.id,
          status: 'stop'
        },
        include: [
          {
            model: services_categories,
            as: 'category',
            attributes: ['id', 'categoryName', 'image'],
            required: false
          }
        ],
        order: [['id', 'DESC']],
        limit: 10
      });

      const obj = provider.toJSON();
      obj.categories = categoryData;
      obj.posts = userPosts;
      obj.completedLiveEvents = completedLiveEvents;
      obj.liveEvents = completedLiveEvents;

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
          exclude: ['password', 'deviceToken', 'deviceType', 'socialId', 'loginType', 'resetToken', 'resetTokenExpiry', 'customerId', 'isNotification', 'walletAmount', 'totalEarning', 'pendingAmount', 'withdrawnAmount', 'isWalletFrozen', 'referralCode', 'referredBy', 'admin_commission', 'govt_tax', 'contact_email', 'contact_phone', 'withdrawal_fees', 'country_fees', 'promotional_fee_waivers', 'supported_currencies', 'tax_rules', 'payout_providers', 'otp', 'otpVerify', 'isProfileComplete', 'createdAt', 'updatedAt', 'deletedAt'],
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

      const completedLiveEvents = await events.findAll({
        where: {
          userId: findProvider.id,
          status: 'stop'
        },
        include: [
          {
            model: services_categories,
            as: 'category',
            attributes: ['id', 'categoryName', 'image'],
            required: false
          }
        ],
        order: [['id', 'DESC']],
        limit: 10
      });

      const providerData = findProvider.toJSON();
      providerData.completedLiveEvents = completedLiveEvents;
      providerData.liveEvents = completedLiveEvents;

      return helper.success(res, "Provider detail fetched successfully", providerData);
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

  /**
   * Get Nearby Providers
   * Filters:
   * - Who declare provider (isProvider: 1 OR currentMode: 'provider' OR isProfileComplete: 2)
   * - Filter by categoryId or categoryIds
   * - Filter / Sort by rating (high_to_low, low_to_high, asc, desc)
   * - Nearby location (latitude, longitude, radius in km)
   */
  nearbyProviders: async (req, res) => {
    try {
      const page = parseInt(req.query.page || (req.body && req.body.page), 10) || 1;
      const limit = parseInt(req.query.limit || (req.body && req.body.limit), 10) || 10;
      const offset = (page - 1) * limit;

      const currentUserId = (req.auth && req.auth.id) || (req.user && req.user.id) || 0;

      // ==========================================
      // 1. LOCATION (LATITUDE, LONGITUDE, RADIUS)
      // ==========================================
      let reqLat = req.query.latitude ? parseFloat(req.query.latitude) : (req.body && req.body.latitude ? parseFloat(req.body.latitude) : null);
      let reqLng = req.query.longitude ? parseFloat(req.query.longitude) : (req.body && req.body.longitude ? parseFloat(req.body.longitude) : null);
      const radiusKm = req.query.radius ? parseFloat(req.query.radius) : (req.body && req.body.radius ? parseFloat(req.body.radius) : null);

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

      // Distance calculation query (Haversine formula in KM)
      let distanceQuery = null;
      let havingConditions = [];

      if (hasCoordinates) {
        distanceQuery = `
          (CASE 
            WHEN users.latitude IS NULL OR users.longitude IS NULL THEN 999999
            ELSE (
              6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                  cos(radians(${reqLat}))
                  * cos(radians(users.latitude))
                  * cos(radians(users.longitude) - radians(${reqLng}))
                  + sin(radians(${reqLat}))
                  * sin(radians(users.latitude))
                ))
              )
            )
          END)
        `;

        if (radiusKm && !isNaN(radiusKm) && radiusKm > 0) {
          havingConditions.push(db.sequelize.literal(`distance <= ${radiusKm}`));
        }
      }

      // ==========================================
      // 2. BASE CONDITION: WHO DECLARES PROVIDER
      // ==========================================
      let whereCondition = {
        status: 'active',
        role: 'user',
        [Op.or]: [
          { isProvider: 1 },
          { currentMode: 'provider' },
          { isProfileComplete: 2 }
        ]
      };

      // Exclude logged-in user from the list
      if (currentUserId > 0) {
        whereCondition.id = { [Op.ne]: currentUserId };
      }

      // Search keyword filter (name, userName, email)
      const searchKey = req.query.search || req.query.searchKey || (req.body && (req.body.search || req.body.searchKey));
      if (searchKey && typeof searchKey === 'string' && searchKey.trim()) {
        const cleanSearch = searchKey.trim();
        whereCondition[Op.and] = whereCondition[Op.and] || [];
        whereCondition[Op.and].push({
          [Op.or]: [
            { name: { [Op.like]: `%${cleanSearch}%` } },
            { userName: { [Op.like]: `%${cleanSearch}%` } },
            { email: { [Op.like]: `%${cleanSearch}%` } }
          ]
        });
      }

      // ==========================================
      // 3. CATEGORY FILTER (categoryId / categoryIds)
      // ==========================================
      let rawCategories = req.query.categoryId || req.query.categoryIds || req.query.categories || (req.body && (req.body.categoryId || req.body.categoryIds || req.body.categories));
      let categoryFilterList = [];

      if (rawCategories) {
        if (Array.isArray(rawCategories)) {
          categoryFilterList = rawCategories.map(c => parseInt(c, 10)).filter(c => !isNaN(c) && c > 0);
        } else if (typeof rawCategories === 'string') {
          categoryFilterList = rawCategories.split(',').map(c => parseInt(c.trim(), 10)).filter(c => !isNaN(c) && c > 0);
        } else if (typeof rawCategories === 'number' && rawCategories > 0) {
          categoryFilterList = [rawCategories];
        }
      }

      if (categoryFilterList.length > 0) {
        const providerCategoryMatches = await user_categories.findAll({
          where: {
            categoryId: { [Op.in]: categoryFilterList }
          },
          attributes: ['userId'],
          raw: true
        });

        const matchedUserIds = [...new Set(providerCategoryMatches.map(p => p.userId))];

        if (matchedUserIds.length === 0) {
          return helper.success(res, "Nearby providers fetched successfully", {
            providers: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNextPage: false
            }
          });
        }

        whereCondition.id = currentUserId > 0
          ? { [Op.in]: matchedUserIds, [Op.ne]: currentUserId }
          : { [Op.in]: matchedUserIds };
      }

      // ==========================================
      // 4. RATING FILTER & SORTING
      // ==========================================
      const rawRating = req.query.rating !== undefined
        ? req.query.rating
        : (req.body && req.body.rating !== undefined
          ? req.body.rating
          : (req.query.minRating !== undefined ? req.query.minRating : (req.body && req.body.minRating)));

      let filterRating = null;
      if (rawRating !== undefined && rawRating !== null && String(rawRating).trim() !== '') {
        const parsedRating = parseFloat(rawRating);
        if (!isNaN(parsedRating) && parsedRating > 0) {
          filterRating = parsedRating;
          havingConditions.push(db.sequelize.literal(`providerAvgRating >= ${filterRating}`));
        }
      }

      const sortBy = req.query.sortBy || (req.body && req.body.sortBy);
      const sortOrder = String(req.query.sortOrder || req.query.order || (req.body && (req.body.sortOrder || req.body.order)) || '').toUpperCase();

      let order = [];
      if (sortBy === 'rating') {
        const ratingDir = sortOrder === 'ASC' ? 'ASC' : 'DESC';
        order.push([db.sequelize.literal('providerAvgRating'), ratingDir]);
        if (hasCoordinates) {
          order.push([db.sequelize.literal('distance'), 'ASC']);
        }
        order.push(['id', 'DESC']);
      } else if (hasCoordinates) {
        order.push([db.sequelize.literal('distance'), 'ASC']);
        order.push([db.sequelize.literal('providerAvgRating'), 'DESC']);
        order.push(['id', 'DESC']);
      } else {
        order.push([db.sequelize.literal('providerAvgRating'), 'DESC']);
        order.push(['id', 'DESC']);
      }

      // ==========================================
      // 5. QUERY PROVIDERS
      // ==========================================
      let attributes = [
        'id',
        'name',
        'userName',
        'email',
        'phone',
        'countryCode',
        'profileImage',
        'profileImageProvider',
        'bio',
        'about',
        'hourlyPrice',
        'currency',
        'isProvider',
        'providerStatus',
        'currentMode',
        'latitude',
        'longitude',
        'location',
        [
          db.sequelize.literal(`(
            SELECT IFNULL(ROUND(AVG(rating), 1), 0)
            FROM rating
            WHERE rating.providerId = users.id
          )`),
          "providerAvgRating"
        ],
        [
          db.sequelize.literal(`(
            SELECT COUNT(*)
            FROM rating
            WHERE rating.providerId = users.id
          )`),
          "totalReviews"
        ]
      ];

      if (hasCoordinates) {
        attributes.push([db.sequelize.literal(distanceQuery), "distance"]);
      } else {
        attributes.push([db.sequelize.literal("NULL"), "distance"]);
      }

      let havingClause = undefined;
      if (havingConditions.length === 1) {
        havingClause = havingConditions[0];
      } else if (havingConditions.length > 1) {
        havingClause = db.sequelize.and(...havingConditions);
      }

      const findProviders = await users.findAll({
        where: whereCondition,
        attributes,
        group: ['users.id'],
        having: havingClause,
        order,
        limit,
        offset,
        subQuery: false
      });

      // Total count query for pagination
      const totalProviders = await users.findAll({
        where: whereCondition,
        attributes: [
          'id',
          [
            db.sequelize.literal(`(
              SELECT IFNULL(ROUND(AVG(rating), 1), 0)
              FROM rating
              WHERE rating.providerId = users.id
            )`),
            "providerAvgRating"
          ],
          ...(hasCoordinates ? [[db.sequelize.literal(distanceQuery), "distance"]] : [])
        ],
        group: ['users.id'],
        having: havingClause,
        subQuery: false
      });
      const totalCount = totalProviders.length;

      // ==========================================
      // 6. ATTACH FULL CATEGORIES FOR EACH PROVIDER
      // ==========================================
      const providerIds = findProviders.map(p => p.id);
      let categoriesByProvider = {};

      if (providerIds.length > 0) {
        const allProviderCats = await user_categories.findAll({
          where: {
            userId: { [Op.in]: providerIds }
          },
          attributes: ['id', 'userId', 'categoryId', 'isPrimary'],
          include: [
            {
              model: services_categories,
              as: 'category',
              attributes: ['id', 'categoryName', 'image']
            }
          ]
        });

        allProviderCats.forEach(catItem => {
          if (!categoriesByProvider[catItem.userId]) {
            categoriesByProvider[catItem.userId] = [];
          }
          categoriesByProvider[catItem.userId].push(catItem);
        });
      }

      // Format response
      const formattedProviders = findProviders.map(provider => {
        const pObj = provider.toJSON();
        pObj.providerAvgRating = parseFloat(pObj.providerAvgRating || 0);
        pObj.totalReviews = parseInt(pObj.totalReviews || 0, 10);

        if (pObj.distance !== null && pObj.distance !== undefined) {
          const rawDist = parseFloat(pObj.distance);
          pObj.distance = rawDist >= 999990 || isNaN(rawDist) ? null : Math.round(rawDist * 100) / 100;
        } else {
          pObj.distance = null;
        }

        const userCats = categoriesByProvider[pObj.id] || [];
        pObj.userCategories = userCats;
        pObj.categories = userCats.map(uc => ({
          id: uc.category ? uc.category.id : uc.categoryId,
          categoryName: uc.category ? uc.category.categoryName : null,
          image: uc.category ? uc.category.image : null,
          isPrimary: uc.isPrimary || 0
        }));

        return pObj;
      });

      return helper.success(res, "Nearby providers fetched successfully", {
        providers: formattedProviders,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          rating: filterRating,
          hasNextPage: page * limit < totalCount
        }
      });

    } catch (error) {
      console.log("nearbyProviders error:", error);
      return helper.error(res, "Something went wrong while fetching nearby providers");
    }
  },

};
