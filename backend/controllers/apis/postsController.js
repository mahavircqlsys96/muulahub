const helper = require('../../helpers/helper');
const { Validator } = require('node-input-validator');
const { Op } = require('sequelize');
const db = require('../../models');
const sequelize = require("sequelize");
const { users, posts, post_likes, post_comments, comment_likes, services_categories, notifications, reports, post_media, bookmarks } = db;

module.exports = {

  createPostOld: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        postType: "required|in:video,photo,text",
        type: "required|in:publish,scheduled",
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const {
        postType,
        caption,
        hashtags,
        categoryId,
        media,
        type,
        date,
        time,
      } = req.body;

      let mediaUrls = [];
      if (media) {
        if (Array.isArray(media)) {
          mediaUrls = media;
        } else if (typeof media === 'string') {
          try {
            const parsed = JSON.parse(media);
            if (Array.isArray(parsed)) mediaUrls = parsed;
            else mediaUrls.push(media);
          } catch (e) {
            mediaUrls.push(media);
          }
        }
      }

      // Media validation
      if (postType !== "text" && mediaUrls.length === 0) {
        return helper.failed(res, `Please provide ${postType} url(s)`);
      }

      // Scheduled post validation
      if (type === "scheduled") {
        if (!date || !time) {
          return helper.failed(
            res,
            "Date and time are required for scheduled posts"
          );
        }
      }

      const post = await posts.create({
        userId: req.auth.id,
        categoryId: categoryId || null,
        postType,
        caption,
        hashtags,
        media: null,
        type,
        date: type === "scheduled" ? date : null,
        time: type === "scheduled" ? time : null,
      });

      if (mediaUrls.length > 0) {
        const mediaRecords = mediaUrls.map(url => ({ postId: post.id, mediaUrl: url }));
        await post_media.bulkCreate(mediaRecords);
      }

      const postWithMedia = await posts.findOne({
        where: { id: post.id },
        include: [{ model: post_media, as: 'postMedia', attributes: ['id', 'mediaUrl'] }]
      });

      return helper.success(
        res,
        type === "publish"
          ? "Post published successfully"
          : "Post scheduled successfully",
        postWithMedia
      );
    } catch (error) {
      console.log(error);
      return helper.error(res, "Something went wrong");
    }
  },
  createPost: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        caption: "required|string",
        categoryId: "required",
        type: "required|in:publish,scheduled,draft",
        allowComments: "required|in:on,off",
        allowShares: "required|in:on,off",
        saveToProfile: "required|in:on,off",
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      console.log(req.body, "Request Body");

      const {
        caption,
        categoryId,
        hashtags,
        type,
        location,
        latitude,
        longitude,
        allowComments,
        allowShares,
        saveToProfile,
        images,
      } = req.body;

      let videoUrl = req.body.video;
      let thumbnailUrl = req.body.thumbnail;

      // Check for file uploads
      if (req.files) {
        if (req.files.video) {
          videoUrl = await helper.fileUpload(req.files.video, "posts");
        }
        if (req.files.thumbnail) {
          thumbnailUrl = await helper.fileUpload(req.files.thumbnail, "posts");
        }
      }

      // Create Post
      const post = await posts.create({
        userId: req.auth.id,
        caption,
        categoryId,
        hashtags: hashtags || null,
        type,
        location: location || null,
        allowComments: allowComments ?? "on",
        allowShares: allowShares ?? "on",
        saveToProfile: saveToProfile ?? "off",
        latitude,
        longitude,
      });

      const mediaRecords = [];

      // Add Video
      if (videoUrl) {
        mediaRecords.push({
          postId: post.id,
          mediaUrl: videoUrl,
          type: "video",
          thumbnail: thumbnailUrl || null,
        });
      }

      // Add Images
      if (images) {
        let imageArray = images;

        // Parse if images is a JSON string
        if (typeof images === "string") {
          try {
            imageArray = JSON.parse(images);
          } catch (err) {
            if (images.startsWith("[") && images.endsWith("]")) {
              const content = images.slice(1, -1).trim();
              imageArray = content ? content.split(",").map((s) => s.trim()) : [];
            } else {
              imageArray = [images];
            }
          }
        }

        // If single image is sent
        if (!Array.isArray(imageArray)) {
          imageArray = [imageArray];
        }

        imageArray.forEach((img) => {
          mediaRecords.push({
            postId: post.id,
            mediaUrl: img,
            type: "image",
          });
        });
      }

      // Insert all media
      if (mediaRecords.length > 0) {
        await post_media.bulkCreate(mediaRecords);
      }

      // Fetch created post with media
      const postWithMedia = await posts.findOne({
        where: { id: post.id },
        include: [
          {
            model: post_media,
            as: "postMedia",
            attributes: ["id", "mediaUrl", "type", "thumbnail"],
          },
        ],
      });

      return helper.success(
        res,
        type === "publish"
          ? "Post published successfully"
          : type === "draft"
            ? "Draft saved successfully"
            : "Post scheduled successfully",
        postWithMedia
      );
    } catch (error) {
      console.log(error);
      return helper.error(res, "Something went wrong");
    }
  },
  getPosts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const categoryId = req.query.categoryId;

      let whereClause = {
        status: "active",
        type: "publish",
      };

      if (categoryId) {
        whereClause.categoryId = categoryId;
      }

      const { count, rows } = await posts.findAndCountAll({
        where: whereClause,

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
              db.sequelize.literal(`0`),
              "shareCount",
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



          ],
        },

        include: [
          {
            model: users,
            as: "user",
            attributes: [
              "id",
              "name",
              "profileImage",
              "profileImageProvider",
              [
                db.sequelize.literal(`(
                  SELECT IFNULL(ROUND(AVG(rating),1),0)
                  FROM rating
                  WHERE rating.providerId = user.id
                )`),
                "providerAvgRating",
              ],
            ],
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

        order: [["createdAt", "DESC"]],
        limit,
        offset,
        distinct: true,
      });


      return helper.success(res, "Feed fetched", {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        data: rows,
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, "Something went wrong");
    }
  },
  getPostDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const post = await posts.findOne({
        where: {
          id,
          status: "active",
        },

        attributes: {
          include: [
            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_likes
              WHERE post_likes.postId = posts.id
            )`),
              "likesCount",
            ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_comments
              WHERE post_comments.postId = posts.id
            )`),
              "commentsCount",
            ],

            // [
            //   sequelize.literal(`(
            //   SELECT COUNT(*)
            //   FROM post_shares
            //   WHERE post_shares.postId = posts.id
            // )`),
            //   "shareCount",
            // ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_likes
              WHERE post_likes.postId = posts.id
              AND post_likes.userId = ${req.auth.id}
            )`),
              "isLiked",
            ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM bookmarks
              WHERE bookmarks.postId = posts.id
              AND bookmarks.userId = ${req.auth ? req.auth.id : 0}
            )`),
              "isBookmarked",
            ],

            [
              sequelize.literal(`(
              SELECT IFNULL(ROUND(AVG(r.rating),1),0)
              FROM rating r
              WHERE r.providerId = posts.userId
            )`),
              "providerAvgRating",
            ],
          ],
        },

        include: [
          {
            model: users,
            as: "user",
            attributes: [
              "id",
              "name",
              "profileImage",
              "profileImageProvider",
            ],
          },

          {
            model: post_media,
            as: "postMedia",
            attributes: ["id", "mediaUrl", "type", "thumbnail"],
            required: false,
          },
        ],
      });

      if (!post) {
        return helper.failed(res, "Post not found");
      }

      return helper.success(
        res,
        "Post fetched successfully",
        post
      );
    } catch (error) {
      console.log(error);
      return helper.error(res, "Something went wrong");
    }
  },

  getPostDetailWithComments: async (req, res) => {
    try {
      const { id } = req.params;

      const post = await posts.findOne({
        where: {
          id,
          status: "active",
        },

        attributes: {
          include: [
            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_likes
              WHERE post_likes.postId = posts.id
            )`),
              "likeCount",
            ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_comments
              WHERE post_comments.postId = posts.id
            )`),
              "commentCount",
            ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM post_likes
              WHERE post_likes.postId = posts.id
              AND post_likes.userId = ${req.auth ? req.auth.id : 0}
            )`),
              "isLiked",
            ],

            [
              sequelize.literal(`(
              SELECT COUNT(*)
              FROM bookmarks
              WHERE bookmarks.postId = posts.id
              AND bookmarks.userId = ${req.auth ? req.auth.id : 0}
            )`),
              "isBookmarked",
            ],

          ],
        },

        include: [
          {
            model: users,
            as: "user",
            attributes: [
              "id",
              "name",
              "profileImage",
              [
                sequelize.literal(`(
                SELECT IFNULL(ROUND(AVG(rating),1),0)
                FROM rating
                WHERE rating.providerId = user.id
              )`),
                "providerAvgRating"
              ],
              [
                sequelize.literal(`(
              SELECT COUNT(*)
              FROM rating
              WHERE rating.providerId = user.id
            )`),
                "totalReview",
              ],
            ],
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
          },

          {
            model: post_comments,
            as: "comments",
            required: false,
            attributes: {
              include: [
                [
                  sequelize.literal(`(
                    SELECT COUNT(*)
                    FROM comment_likes
                    WHERE comment_likes.commentId = comments.id
                  )`),
                  "likeCount"
                ],
                [
                  sequelize.literal(`(
                    SELECT COUNT(*)
                    FROM comment_likes
                    WHERE comment_likes.commentId = comments.id
                    AND comment_likes.userId = ${req.auth ? req.auth.id : 0}
                  )`),
                  "isLiked"
                ]
              ]
            },
            include: [
              {
                model: users,
                as: "commenter",
                attributes: ["id", "name", "profileImage", "profileImageProvider"],
              }
            ]
          }
        ],
        order: [
          [{ model: post_comments, as: 'comments' }, 'createdAt', 'DESC']
        ]
      });

      if (!post) {
        return helper.failed(res, "Post not found");
      }

      return helper.success(
        res,
        "Post fetched successfully",
        post
      );
    } catch (error) {
      console.log(error);
      return helper.error(res, "Something went wrong");
    }
  },

  deletePost: async (req, res) => {
    try {
      const { id } = req.params;
      const post = await posts.findOne({ where: { id, userId: req.auth.id } });
      if (!post) return helper.failed(res, 'Post not found or unauthorized');
      await post.update({ status: 'deleted' });
      return helper.success(res, 'Post deleted successfully');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  bookmarkPost: async (req, res) => {
    try {
      const { postId } = req.body;
      const userId = req.auth.id;

      const v = new Validator(req.body, {
        postId: "required",
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const post = await posts.findOne({ where: { id: postId, status: 'active' } });
      if (!post) {
        return helper.failed(res, 'Post not found');
      }

      const existingBookmark = await bookmarks.findOne({
        where: { userId, postId }
      });

      if (existingBookmark) {
        await existingBookmark.destroy();
        return helper.success(res, 'Post removed from bookmarks', { isBookmarked: 0 });
      }

      await bookmarks.create({ userId, postId });
      return helper.success(res, 'Post added to bookmarks', { isBookmarked: 1 });

    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  getBookmarkedPosts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const userId = req.auth.id;

      let findPosts = await posts.findAll({
        where: {
          status: 'active',
          type: 'publish',
        },
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
            model: bookmarks,
            as: 'bookmarks',
            where: { userId },
            required: true,
            attributes: []
          },
          {
            model: users,
            as: 'user',
            attributes: [
              'id', 'name', 'profileImage', 'profileImageProvider',
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

      return helper.success(res, 'Bookmarked posts fetched', {
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

  likePost: async (req, res) => {
    try {
      const { postId } = req.body;
      const userId = req.auth.id;

      const v = new Validator(req.body, {
        postId: "required",

      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const post = await posts.findOne({ where: { id: postId, status: 'active' } });
      if (!post) return helper.failed(res, 'Post not found');

      const existing = await post_likes.findOne({ where: { postId, userId } });

      if (existing) {
        await existing.destroy();
        return helper.success(res, 'Post unliked');
      }

      await post_likes.create({ postId, userId });

      if (post.userId !== userId) {
        await notifications.create({
          userId: post.userId,
          senderId: userId,
          title: 'New Like',
          message: `${req.auth.name} liked your post`,
          type: 'system',
          referenceId: postId
        });
      }

      return helper.success(res, 'Post liked');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  addComment: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        postId: 'required',
        comment: 'required|string'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { postId, comment, commentId } = req.body;
      const userId = req.auth.id;

      const post = await posts.findOne({ where: { id: postId, status: 'active' } });
      if (!post) return helper.failed(res, 'Post not found');

      const newComment = await post_comments.create({
        postId,
        userId,
        comment,
        ...(commentId && { commentId })
      });

      if (post.userId !== userId) {
        await notifications.create({
          userId: post.userId,
          senderId: userId,
          title: 'New Comment',
          message: `${req.auth.name} commented on your post`,
          type: 'system',
          referenceId: postId
        });
      }

      const commentWithUser = await post_comments.findOne({
        where: { id: newComment.id },
        include: [{ model: users, as: 'commenter', attributes: ['id', 'name', 'profileImage'] }]
      });

      return helper.success(res, 'Comment added', commentWithUser);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  getComments: async (req, res) => {
    try {
      const { postId } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      if (!postId) return helper.failed(res, 'postId is required');

      const { count, rows } = await post_comments.findAndCountAll({
        where: { postId, commentId: null },
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM comment_likes
                WHERE comment_likes.commentId = post_comments.id
              )`),
              "likeCount"
            ],
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM comment_likes
                WHERE comment_likes.commentId = post_comments.id
                AND comment_likes.userId = ${req.auth ? req.auth.id : 0}
              )`),
              "isLiked"
            ]
          ]
        },
        include: [{ model: users, as: 'commenter', attributes: ['id', 'name', 'profileImage'] }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Comments fetched', {
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

  getCommentReplies: async (req, res) => {
    try {
      const { commentId } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      if (!commentId) return helper.failed(res, 'commentId is required');

      const { count, rows } = await post_comments.findAndCountAll({
        where: { commentId },
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM comment_likes
                WHERE comment_likes.commentId = post_comments.id
              )`),
              "likeCount"
            ],
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM comment_likes
                WHERE comment_likes.commentId = post_comments.id
                AND comment_likes.userId = ${req.auth ? req.auth.id : 0}
              )`),
              "isLiked"
            ]
          ]
        },
        include: [{ model: users, as: 'commenter', attributes: ['id', 'name', 'profileImage'] }],
        order: [['createdAt', 'ASC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Replies fetched', {
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

  likeComment: async (req, res) => {
    try {
      const { commentId } = req.body;
      const userId = req.auth.id;

      const v = new Validator(req.body, {
        commentId: "required",
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const comment = await post_comments.findOne({ where: { id: commentId } });
      if (!comment) return helper.failed(res, 'Comment not found');

      const existing = await comment_likes.findOne({ where: { commentId, userId } });

      if (existing) {
        await existing.destroy();
        return helper.success(res, 'Comment unliked');
      }

      await comment_likes.create({ commentId, userId });

      if (comment.userId !== userId) {
        await notifications.create({
          userId: comment.userId,
          senderId: userId,
          title: 'New Like on Comment',
          message: `${req.auth.name} liked your comment`,
          type: 'system',
          referenceId: comment.postId
        });
      }

      return helper.success(res, 'Comment liked');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  reportPost: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        postId: 'required',
        reason: 'required|string'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      await reports.create({
        reportBy: req.auth.id,
        reportType: 'post',
        referenceId: req.body.postId,
        reason: req.body.reason
      });

      await posts.update({ status: 'reported' }, { where: { id: req.body.postId } });

      return helper.success(res, 'Post reported successfully');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  getDraftPosts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const searchKey = req.query.searchKey || "";

      let whereCondition = {
        userId: req.auth.id,
        status: "active",
        type: "draft",
      };

      if (searchKey.trim()) {
        whereCondition = {
          ...whereCondition,
          [Op.or]: [
            {
              caption: {
                [Op.like]: `%${searchKey}%`
              }
            },
            {
              hashtags: {
                [Op.like]: `%${searchKey}%`
              }
            }
          ]
        };
      }

      let findPosts = await posts.findAll({
        where: whereCondition,
        include: [
          {
            model: users,
            as: "user",
            attributes: ["id", "name", "profileImage", "profileImageProvider"],
          },
          {
            model: post_media,
            as: "postMedia",
            attributes: ["id", "mediaUrl", "type", "thumbnail"],
            required: false,
          }
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset
      });

      return helper.success(res, "Draft posts fetched successfully", {
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
      return helper.error(res, "Something went wrong");
    }
  },

  publishOrDeclinePost: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        postId: "required",
        action: "required|in:publish,decline"
      });

      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { postId, action } = req.body;

      const post = await posts.findOne({
        where: {
          id: postId,
          userId: req.auth.id,
          type: "draft",
          status: "active"
        }
      });

      if (!post) {
        return helper.failed(res, "Draft post not found or unauthorized");
      }

      if (action === "publish") {
        await post.update({ type: "publish" });
        return helper.success(res, "Draft post published successfully");
      } else if (action === "decline") {
        await post.update({ status: "deleted" });
        return helper.success(res, "Draft post declined successfully");
      }
    } catch (error) {
      console.log(error);
      return helper.error(res, "Something went wrong");
    }
  }
};
