const db = require('../../models');
const { Op } = require('sequelize');
const helper = require('../../helpers/helper');
const { users, reports } = db;

module.exports = {

  reportList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const reportType = req.query.reportType;
      const status = req.query.status;
      const search = req.query.search;

      let whereClause = {};
      if (reportType) whereClause.reportType = reportType;
      if (status) whereClause.status = status;
      if (search) {
        whereClause[Op.or] = [
          { reason: { [Op.like]: `%${search}%` } },
          { adminRemarks: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await reports.findAndCountAll({
        where: whereClause,
        include: [{
          model: users,
          as: 'reporter',
          attributes: ['id', 'name', 'email', 'phone', 'role'],
          required: false,
          paranoid: false
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, 'Reports fetched', {
        reports_list: rows,
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

  updateReportStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, adminNote, adminRemarks } = req.body;

      const report = await reports.findOne({ where: { id } });
      if (!report) return helper.failed(res, 'Report not found');

      await report.update({ status: status || 'resolved', adminRemarks: adminNote || adminRemarks });
      return helper.success(res, 'Report updated', report);
    } catch (error) {
      console.log(error);
      return helper.error(res, 'Something went wrong');
    }
  },

  getReportDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const report = await reports.findOne({
        where: { id },
        include: [{
          model: users,
          as: 'reporter',
          attributes: ['id', 'name', 'email', 'phone', 'role', 'profileImage', 'createdAt'],
          required: false,
          paranoid: false
        }]
      });

      if (!report) return helper.failed(res, 'Report not found');

      const reportData = report.toJSON ? report.toJSON() : report;
      let targetDetails = null;
      const reportTypeLower = (report.reportType || '').toLowerCase();

      if (reportTypeLower === 'user' && report.referenceId) {
        const targetUser = await users.findOne({
          where: { id: report.referenceId },
          attributes: ['id', 'name', 'email', 'phone', 'role', 'status', 'profileImage', 'createdAt'],
          paranoid: false
        });
        if (targetUser) targetDetails = targetUser.toJSON ? targetUser.toJSON() : targetUser;
      } else if (reportTypeLower === 'post' && report.referenceId) {
        if (db.posts) {
          const targetPost = await db.posts.findOne({
            where: { id: report.referenceId },
            include: [
              {
                model: users,
                as: 'user',
                attributes: ['id', 'name', 'email', 'phone', 'profileImage', 'role'],
                required: false
              },
              ...(db.post_media ? [{
                model: db.post_media,
                as: 'postMedia',
                attributes: ['id', 'mediaUrl', 'thumbnail', 'type'],
                required: false
              }] : []),
              ...(db.services_categories ? [{
                model: db.services_categories,
                as: 'category',
                attributes: ['id', 'categoryName'],
                required: false
              }] : [])
            ]
          });
          if (targetPost) {
            const pData = targetPost.toJSON ? targetPost.toJSON() : targetPost;
            pData.media = pData.postMedia ? pData.postMedia.map(m => ({
              id: m.id,
              url: m.mediaUrl,
              mediaUrl: m.mediaUrl,
              thumbnail: m.thumbnail,
              type: m.type
            })) : [];
            targetDetails = pData;
          }
        }
      } else if ((reportTypeLower === 'job' || reportTypeLower === 'booking') && report.referenceId) {
        if (db.bookings) {
          const targetBooking = await db.bookings.findOne({
            where: { id: report.referenceId },
            include: [
              { model: users, as: 'user', attributes: ['id', 'name', 'email', 'phone'], required: false },
              { model: users, as: 'provider', attributes: ['id', 'name', 'email', 'phone'], required: false }
            ]
          });
          if (targetBooking) targetDetails = targetBooking.toJSON ? targetBooking.toJSON() : targetBooking;
        }
      }

      return helper.success(res, 'Report details fetched successfully', {
        ...reportData,
        targetDetails
      });
    } catch (error) {
      console.error("getReportDetail error:", error);
      return helper.error(res, 'Failed to fetch report details');
    }
  }
};
