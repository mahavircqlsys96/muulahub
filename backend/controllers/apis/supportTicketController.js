const helper = require('../../helpers/helper');
const { Op } = require('sequelize');
const db = require('../../models');

const getModel = () => db.supportTickets || db.support_tickets;

module.exports = {
  /**
   * API 1: Raise Support Ticket
   * Endpoint: POST /api/v1/raiseTicket
   */
  raiseTicket: async (req, res) => {
    try {
      const userId = (req.auth && req.auth.id) || (req.user && req.user.id);
      if (!userId) return helper.unauthorized(res, "Authentication required.");

      const { subject, description } = req.body;

      if (!subject || !String(subject).trim()) {
        return helper.failed(res, "Subject is required.");
      }
      if (!description || !String(description).trim()) {
        return helper.failed(res, "Description is required.");
      }

      const cleanSubject = String(subject).trim();
      const cleanDescription = String(description).trim();

      if (cleanSubject.length < 3) {
        return helper.failed(res, "Subject must be at least 3 characters.");
      }
      if (cleanDescription.length < 5) {
        return helper.failed(res, "Description must be at least 5 characters.");
      }

      // Generate unique ticket number: e.g. TKT-20261128-4821
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const ticketNumber = `TKT-${dateStr}-${randomSuffix}`;

      const supportTickets = getModel();
      const ticket = await supportTickets.create({
        userId,
        ticketNumber,
        subject: cleanSubject,
        description: cleanDescription,
        status: 'Pending',
        adminRemark: null,
        resolvedAt: null,
        rejectedAt: null
      });

      return helper.success(res, "Support ticket created successfully.", ticket, 201);
    } catch (error) {
      console.error("raiseTicket error:", error);
      return helper.error(res, "Failed to raise support ticket: " + error.message);
    }
  },

  /**
   * API 2: My Tickets Listing
   * Endpoint: GET /api/v1/myTickets
   */
  myTickets: async (req, res) => {
    try {
      const userId = (req.auth && req.auth.id) || (req.user && req.user.id);
      if (!userId) return helper.unauthorized(res, "Authentication required.");

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const statusFilter = req.query.status;

      const where = { userId };
      if (statusFilter && statusFilter.toLowerCase() !== 'all' && statusFilter.trim() !== '') {
        const normalized = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase();
        if (['Pending', 'Resolved', 'Rejected'].includes(normalized)) {
          where.status = normalized;
        }
      }

      const supportTickets = getModel();
      const { count, rows } = await supportTickets.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return helper.success(res, "Tickets retrieved successfully.", {
        list: rows,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
        page,
        limit
      });
    } catch (error) {
      console.error("myTickets error:", error);
      return helper.error(res, "Failed to retrieve support tickets: " + error.message);
    }
  },

  /**
   * API 3: Ticket Details
   * Endpoint: GET /api/v1/ticketDetail/:id
   */
  ticketDetail: async (req, res) => {
    try {
      const userId = (req.auth && req.auth.id) || (req.user && req.user.id);
      if (!userId) return helper.unauthorized(res, "Authentication required.");

      const { id } = req.params;
      const supportTickets = getModel();

      const ticket = await supportTickets.findOne({
        where: {
          [Op.or]: [
            { id: isNaN(Number(id)) ? 0 : Number(id) },
            { ticketNumber: id }
          ],
          userId
        }
      });

      if (!ticket) {
        return helper.failed(res, "Ticket not found or you do not have permission to view it.", {}, 404);
      }

      return helper.success(res, "Ticket details retrieved successfully.", ticket);
    } catch (error) {
      console.error("ticketDetail error:", error);
      return helper.error(res, "Failed to retrieve ticket details: " + error.message);
    }
  }
};
