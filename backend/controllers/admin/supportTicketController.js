const helper = require('../../helpers/helper');
const { Op, Sequelize } = require('sequelize');
const db = require('../../models');
const { users } = db;

const getModel = () => db.supportTickets || db.support_tickets;

module.exports = {
  /**
   * API 4: Admin Ticket Listing
   * Endpoint: GET /api/v1/admin/ticketList or GET /admin/ticketList
   */
  ticketList: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = (req.query.search || '').trim();
      const statusFilter = req.query.status;
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder || 'DESC';

      const supportTickets = getModel();

      let andConditions = [];

      // Status filter
      if (statusFilter && statusFilter.toLowerCase() !== 'all' && statusFilter.trim() !== '') {
        const normalized = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase();
        if (['Pending', 'Resolved', 'Rejected'].includes(normalized)) {
          andConditions.push({ status: normalized });
        }
      }

      // Search across ticket number, subject, description
      if (search) {
        andConditions.push({
          [Op.or]: [
            { ticketNumber: { [Op.like]: `%${search}%` } },
            { subject: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
            { '$user.name$': { [Op.like]: `%${search}%` } },
            { '$user.email$': { [Op.like]: `%${search}%` } },
            { '$user.phone$': { [Op.like]: `%${search}%` } }
          ]
        });
      }

      const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

      const { count, rows } = await supportTickets.findAndCountAll({
        where,
        include: [
          {
            model: users,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone', 'countryCode', 'profileImage', 'isApproved', 'isVerified']
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
        limit,
        offset,
        distinct: true
      });

      // Quick status counts for dashboard stats
      const [pendingCount, resolvedCount, rejectedCount, totalTickets] = await Promise.all([
        supportTickets.count({ where: { status: 'Pending' } }).catch(() => 0),
        supportTickets.count({ where: { status: 'Resolved' } }).catch(() => 0),
        supportTickets.count({ where: { status: 'Rejected' } }).catch(() => 0),
        supportTickets.count().catch(() => 0)
      ]);

      return helper.success(res, "Support tickets retrieved successfully.", {
        list: rows,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
        page,
        limit,
        stats: {
          all: totalTickets,
          pending: pendingCount,
          resolved: resolvedCount,
          rejected: rejectedCount
        }
      });
    } catch (error) {
      console.error("admin ticketList error:", error);
      return helper.error(res, "Failed to retrieve tickets: " + error.message);
    }
  },

  /**
   * API 5: Admin Ticket Details
   * Endpoint: GET /api/v1/admin/ticketDetail/:id or GET /admin/ticketDetail/:id
   */
  ticketDetail: async (req, res) => {
    try {
      const { id } = req.params;
      const supportTickets = getModel();

      const ticket = await supportTickets.findOne({
        where: {
          [Op.or]: [
            { id: isNaN(Number(id)) ? 0 : Number(id) },
            { ticketNumber: id }
          ]
        },
        include: [
          {
            model: users,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone', 'countryCode', 'profileImage', 'isApproved', 'isVerified', 'createdAt', 'status']
          }
        ]
      });

      if (!ticket) {
        return helper.failed(res, "Ticket not found.", {}, 404);
      }

      return helper.success(res, "Ticket details retrieved successfully.", ticket);
    } catch (error) {
      console.error("admin ticketDetail error:", error);
      return helper.error(res, "Failed to retrieve ticket details: " + error.message);
    }
  },

  /**
   * API 6: Admin Update Ticket Status
   * Endpoint: POST /api/v1/admin/updateTicketStatus or PUT /admin/updateTicketStatus/:id?
   */
  updateTicketStatus: async (req, res) => {
    try {
      const ticketId = req.params.id || req.body.ticketId || req.body.id;
      const { status, adminRemark } = req.body;

      if (!ticketId) {
        return helper.failed(res, "Ticket ID is required.");
      }

      const validStatuses = ['Pending', 'Resolved', 'Rejected'];
      const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : '';

      if (!validStatuses.includes(normalizedStatus)) {
        return helper.failed(res, "Invalid status. Allowed values are: Pending, Resolved, Rejected.");
      }

      // If rejected, rejection reason / admin remark is required
      if (normalizedStatus === 'Rejected' && (!adminRemark || !String(adminRemark).trim())) {
        return helper.failed(res, "Admin remark / rejection reason is required when rejecting a ticket.");
      }

      const supportTickets = getModel();
      const ticket = await supportTickets.findOne({
        where: {
          [Op.or]: [
            { id: isNaN(Number(ticketId)) ? 0 : Number(ticketId) },
            { ticketNumber: ticketId }
          ]
        },
        include: [
          {
            model: users,
            as: 'user',
            attributes: ['id', 'name', 'email', 'deviceToken', 'phone']
          }
        ]
      });

      if (!ticket) {
        return helper.failed(res, "Ticket not found.", {}, 404);
      }

      const updateData = {
        status: normalizedStatus,
        adminRemark: adminRemark ? String(adminRemark).trim() : ticket.adminRemark
      };

      if (normalizedStatus === 'Resolved') {
        updateData.resolvedAt = new Date();
        updateData.rejectedAt = null;
      } else if (normalizedStatus === 'Rejected') {
        updateData.rejectedAt = new Date();
        updateData.resolvedAt = null;
      } else if (normalizedStatus === 'Pending') {
        updateData.resolvedAt = null;
        updateData.rejectedAt = null;
      }

      await ticket.update(updateData);

      // Send push notification to user regarding ticket status change
      try {
        if (ticket.user && ticket.user.deviceToken) {
          await helper.sendPushNotification({
            token: ticket.user.deviceToken,
            title: `Support Ticket ${normalizedStatus}`,
            body: `Your ticket ${ticket.ticketNumber} ("${ticket.subject}") has been marked as ${normalizedStatus}.${adminRemark ? ' Note: ' + adminRemark : ''}`,
            type: "ticket_update",
            sender_id: req.user ? req.user.id : 1
          });
        }
      } catch (pushErr) {
        console.error("Push notification error on ticket update:", pushErr.message);
      }

      return helper.success(res, `Ticket status updated to ${normalizedStatus} successfully.`, ticket);
    } catch (error) {
      console.error("admin updateTicketStatus error:", error);
      return helper.error(res, "Failed to update ticket status: " + error.message);
    }
  }
};
