const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { users, posts, post_likes, post_comments, reports, post_media } = db;

module.exports = {

  postsList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status;
      const postType = req.query.postType;

      const userId = req.query.userId;
      let whereClause = {};
      if (status) whereClause.status = status;
      if (postType) whereClause.postType = postType;
      if (search) whereClause.caption = { [Op.like]: `%${search}%` };
      if (userId) {
        const uid = parseInt(userId, 10);
        if (!Number.isNaN(uid)) whereClause.userId = uid;
      }

      const { count, rows } = await posts.findAndCountAll({
        where: whereClause,
        include: [
          { model: users, as: 'user', attributes: ['id', 'name', 'email', 'profileImage'] },
          { model: post_media, as: 'postMedia', attributes: ['id', 'mediaUrl'] }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      const postIds = rows.map(p => p.id);
      let likeCounts = [];
      let commentCounts = [];
      if (postIds.length) {
        [likeCounts, commentCounts] = await Promise.all([
          post_likes.findAll({
            attributes: ['postId', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
            where: { postId: { [Op.in]: postIds } },
            group: ['postId'],
            raw: true
          }),
          post_comments.findAll({
            attributes: ['postId', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
            where: { postId: { [Op.in]: postIds } },
            group: ['postId'],
            raw: true
          })
        ]);
      }

      const likeMap = Object.fromEntries(likeCounts.map(l => [String(l.postId), parseInt(l.count)]));
      const commentMap = Object.fromEntries(commentCounts.map(c => [String(c.postId), parseInt(c.count)]));

      const data = rows.map(p => {
        let postData = p.toJSON();
        postData.media = postData.postMedia ? postData.postMedia.map(m => m.mediaUrl) : [];
        delete postData.postMedia;
        return {
          ...postData,
          likesCount: likeMap[String(p.id)] || 0,
          commentsCount: commentMap[String(p.id)] || 0
        };
      });

      return helper.success(res, 'Posts fetched', {
        list: data,
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit)
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  updatePostStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'reported', 'deleted'].includes(status)) {
        return helper.failed(res, 'Invalid status');
      }

      const post = await posts.findOne({ where: { id } });
      if (!post) return helper.failed(res, 'Post not found');

      await post.update({ status });
      return helper.success(res, `Post status updated to ${status}`);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  deletePost: async (req, res) => {
    try {
      const { id } = req.params;
      const post = await posts.findOne({ where: { id } });
      if (!post) return helper.failed(res, 'Post not found');
      await post.update({ status: 'deleted' });
      return helper.success(res, 'Post deleted successfully');
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  postDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const post = await posts.findOne({
        where: { id },
        include: [
          { model: users, as: 'user', attributes: ['id', 'name', 'email', 'profileImage'] },
          { model: post_media, as: 'postMedia', attributes: ['id', 'mediaUrl'] }
        ]
      });

      if (!post) return helper.failed(res, 'Post not found');

      const [likesCount, commentsCount] = await Promise.all([
        post_likes.count({ where: { postId: id } }),
        post_comments.count({ where: { postId: id } })
      ]);

      const recentComments = await post_comments.findAll({
        where: { postId: id },
        include: [{ model: users, as: 'commenter', attributes: ['id', 'name', 'profileImage'] }],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      let postData = post.toJSON();
      postData.media = postData.postMedia ? postData.postMedia.map(m => m.mediaUrl) : [];
      delete postData.postMedia;

      return helper.success(res, 'Post detail fetched', {
        ...postData,
        likesCount,
        commentsCount,
        recentComments
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  }
};
