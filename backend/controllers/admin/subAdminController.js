const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { Validator } = require('node-input-validator');
const db = require('../../models');
const helper = require('../../helpers/helper');
const { MODULES, SYSTEM_ROLES, seedDefaultRoles } = require('../../helpers/rolePermissions');

const { users, admin_roles } = db;

module.exports = {
  /**
   * Get Catalog of all available system modules and permission actions
   */
  getPermissionsCatalog: async (req, res) => {
    try {
      return helper.success(res, "Permissions catalog fetched successfully", {
        modules: MODULES,
        systemRoles: SYSTEM_ROLES
      });
    } catch (error) {
      console.error("getPermissionsCatalog error:", error);
      return helper.error(res, "Failed to fetch permissions catalog");
    }
  },

  /**
   * List all admin roles with user counts
   */
  getRoles: async (req, res) => {
    try {
      // Ensure default system roles exist
      await seedDefaultRoles(db);

      const roles = await admin_roles.findAll({
        order: [['isSystem', 'DESC'], ['id', 'ASC']]
      });

      // Count active subadmins assigned to each role
      const rolesWithCounts = await Promise.all(roles.map(async (r) => {
        const count = await users.count({
          where: {
            adminRoleId: r.id,
            role: 'admin',
            deletedAt: null
          }
        });
        const roleData = r.toJSON ? r.toJSON() : r;
        return {
          ...roleData,
          userCount: count
        };
      }));

      return helper.success(res, "Roles fetched successfully", rolesWithCounts);
    } catch (error) {
      console.error("getRoles error:", error);
      return helper.error(res, "Failed to fetch roles");
    }
  },

  /**
   * Get single role details
   */
  getRoleById: async (req, res) => {
    try {
      const { id } = req.params;
      const role = await admin_roles.findOne({ where: { id } });
      if (!role) return helper.failed(res, "Role not found");
      return helper.success(res, "Role details fetched successfully", role);
    } catch (error) {
      console.error("getRoleById error:", error);
      return helper.error(res, "Failed to fetch role");
    }
  },

  /**
   * Create a new custom role
   */
  createRole: async (req, res) => {
    try {
      if (req.auth.isSubAdmin || (req.auth.adminRoleSlug && req.auth.adminRoleSlug !== 'super_admin')) {
        return helper.failed(res, "Only Super Admin has permission to manage roles");
      }

      const v = new Validator(req.body, {
        name: 'required|string|minLength:3|maxLength:100',
        permissions: 'required|array'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { name, description, permissions } = req.body;

      // Generate slug from name
      let slug = req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
      const existing = await admin_roles.findOne({ where: { slug } });
      if (existing) {
        slug = `${slug}_${Date.now()}`;
      }

      const newRole = await admin_roles.create({
        name: name.trim(),
        slug,
        description: description || null,
        permissions: Array.isArray(permissions) ? permissions : [],
        isSystem: 0
      });

      return helper.success(res, "Role created successfully", newRole);
    } catch (error) {
      console.error("createRole error:", error);
      return helper.error(res, "Failed to create role");
    }
  },

  /**
   * Update role permissions and details
   */
  updateRole: async (req, res) => {
    try {
      if (req.auth.isSubAdmin || (req.auth.adminRoleSlug && req.auth.adminRoleSlug !== 'super_admin')) {
        return helper.failed(res, "Only Super Admin has permission to manage roles");
      }

      const { id } = req.params;
      const role = await admin_roles.findOne({ where: { id } });
      if (!role) return helper.failed(res, "Role not found");

      const { name, description, permissions } = req.body;

      const updateData = {};
      if (name && !role.isSystem) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description;
      if (permissions && Array.isArray(permissions)) updateData.permissions = permissions;

      await role.update(updateData);
      return helper.success(res, "Role updated successfully", role);
    } catch (error) {
      console.error("updateRole error:", error);
      return helper.error(res, "Failed to update role");
    }
  },

  /**
   * Delete custom role
   */
  deleteRole: async (req, res) => {
    try {
      if (req.auth.isSubAdmin || (req.auth.adminRoleSlug && req.auth.adminRoleSlug !== 'super_admin')) {
        return helper.failed(res, "Only Super Admin has permission to manage roles");
      }

      const { id } = req.params;
      const role = await admin_roles.findOne({ where: { id } });
      if (!role) return helper.failed(res, "Role not found");

      if (role.isSystem) {
        return helper.failed(res, "System roles cannot be deleted");
      }

      const assignedCount = await users.count({
        where: { adminRoleId: id, role: 'admin', deletedAt: null }
      });
      if (assignedCount > 0) {
        return helper.failed(res, `Cannot delete role: ${assignedCount} sub-admin(s) are currently assigned to this role. Reassign them first.`);
      }

      await role.destroy();
      return helper.success(res, "Role deleted successfully");
    } catch (error) {
      console.error("deleteRole error:", error);
      return helper.error(res, "Failed to delete role");
    }
  },

  /**
   * List all Sub-Admins with search, filter and pagination
   */
  getSubAdmins: async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
      const offset = (page - 1) * limit;

      const { search, roleId, status } = req.query;

      const whereClause = {
        role: 'admin',
        deletedAt: null
      };

      if (search && search.trim() !== '') {
        const s = `%${search.trim()}%`;
        whereClause[Op.or] = [
          { name: { [Op.like]: s } },
          { email: { [Op.like]: s } },
          { userName: { [Op.like]: s } },
          { phone: { [Op.like]: s } }
        ];
      }

      if (roleId) {
        whereClause.adminRoleId = roleId;
      }

      if (status) {
        whereClause.status = status;
      }

      const { count, rows } = await users.findAndCountAll({
        where: whereClause,
        attributes: [
          'id', 'name', 'userName', 'email', 'phone', 'countryCode',
          'profileImage', 'role', 'adminRoleId', 'adminRoleSlug',
          'adminPermissions', 'isSubAdmin', 'status', 'loginTime',
          'createdAt', 'updatedAt'
        ],
        include: [
          {
            model: admin_roles,
            as: 'adminRole',
            attributes: ['id', 'name', 'slug', 'description', 'permissions', 'isSystem'],
            required: false
          }
        ],
        order: [['id', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      return helper.success(res, "Sub-admins list fetched successfully", {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        list: rows
      });
    } catch (error) {
      console.error("getSubAdmins error:", error);
      return helper.error(res, "Failed to fetch sub-admins");
    }
  },

  /**
   * Get single Sub-Admin details
   */
  getSubAdminById: async (req, res) => {
    try {
      const { id } = req.params;
      const subAdmin = await users.findOne({
        where: { id, role: 'admin', deletedAt: null },
        attributes: [
          'id', 'name', 'userName', 'email', 'phone', 'countryCode',
          'profileImage', 'role', 'adminRoleId', 'adminRoleSlug',
          'adminPermissions', 'isSubAdmin', 'status', 'loginTime',
          'createdAt', 'updatedAt'
        ],
        include: [
          {
            model: admin_roles,
            as: 'adminRole',
            attributes: ['id', 'name', 'slug', 'description', 'permissions']
          }
        ]
      });

      if (!subAdmin) return helper.failed(res, "Sub-admin not found");
      return helper.success(res, "Sub-admin retrieved successfully", subAdmin);
    } catch (error) {
      console.error("getSubAdminById error:", error);
      return helper.error(res, "Failed to fetch sub-admin details");
    }
  },

  /**
   * Create a new Sub-Admin
   */
  createSubAdmin: async (req, res) => {
    try {
      if (req.auth.isSubAdmin || (req.auth.adminRoleSlug && req.auth.adminRoleSlug !== 'super_admin')) {
        return helper.failed(res, "Only Super Admin has permission to add new sub-admins");
      }

      const v = new Validator(req.body, {
        name: 'required|string|minLength:2',
        email: 'required|email',
        password: 'required|string|minLength:6',
        adminRoleId: 'required|integer'
      });
      const errors = await helper.checkValidation(v);
      if (errors) return helper.failed(res, errors);

      const { name, email, password, phone, countryCode, adminRoleId, adminPermissions, status } = req.body;

      // Check role existence
      const role = await admin_roles.findOne({ where: { id: adminRoleId } });
      if (!role) {
        return helper.failed(res, "Selected role does not exist");
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check existing email
      const existingUser = await users.findOne({ where: { email: cleanEmail } });
      if (existingUser) {
        // If already an active admin/sub-admin
        if (existingUser.role === 'admin' && existingUser.deletedAt === null) {
          return helper.failed(
            res,
            existingUser.isSubAdmin
              ? "A sub-admin account with this email already exists."
              : "This email belongs to the primary Super Admin account."
          );
        }

        // If email belongs to an existing regular user or soft-deleted account, upgrade/convert to Sub-Admin
        existingUser.name = name.trim();
        existingUser.role = 'admin';
        existingUser.isSubAdmin = 1;
        existingUser.adminRoleId = role.id;
        existingUser.adminRoleSlug = role.slug;
        existingUser.adminPermissions = Array.isArray(adminPermissions) ? adminPermissions : null;
        existingUser.status = status && ['active', 'inactive', 'blocked'].includes(status) ? status : 'active';
        existingUser.deletedAt = null;
        if (phone) existingUser.phone = phone;
        if (countryCode) existingUser.countryCode = countryCode;
        if (password && password.trim()) {
          existingUser.password = await bcrypt.hash(password.trim(), 10);
        }
        await existingUser.save();

        return helper.success(res, "Existing account upgraded to Sub-Admin successfully", {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          userName: existingUser.userName,
          role: existingUser.role,
          adminRoleSlug: existingUser.adminRoleSlug,
          adminRoleId: existingUser.adminRoleId
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate unique username
      let baseUserName = (req.body.userName || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!baseUserName || baseUserName.length < 3) baseUserName = 'subadmin';
      let userName = baseUserName;
      let counter = 1;
      while (await users.findOne({ where: { userName } })) {
        userName = `${baseUserName}${counter++}`;
      }

      const newSubAdmin = await users.create({
        name: name.trim(),
        userName,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        phone: phone || null,
        countryCode: countryCode || '+1',
        role: 'admin',
        isSubAdmin: 1,
        adminRoleId: role.id,
        adminRoleSlug: role.slug,
        adminPermissions: Array.isArray(adminPermissions) ? adminPermissions : null,
        status: status && ['active', 'inactive', 'blocked'].includes(status) ? status : 'active'
      });

      return helper.success(res, "Sub-admin created successfully", {
        id: newSubAdmin.id,
        name: newSubAdmin.name,
        email: newSubAdmin.email,
        userName: newSubAdmin.userName,
        role: newSubAdmin.role,
        adminRoleSlug: newSubAdmin.adminRoleSlug,
        adminRoleId: newSubAdmin.adminRoleId
      });

    } catch (error) {
      console.error("createSubAdmin error:", error);
      return helper.error(res, "Failed to create sub-admin: " + error.message);
    }
  },

  /**
   * Update existing Sub-Admin
   */
  updateSubAdmin: async (req, res) => {
    try {
      if (req.auth.isSubAdmin || (req.auth.adminRoleSlug && req.auth.adminRoleSlug !== 'super_admin')) {
        return helper.failed(res, "Only Super Admin has permission to update sub-admins");
      }

      const { id } = req.params;
      const subAdmin = await users.findOne({ where: { id, role: 'admin', deletedAt: null } });
      if (!subAdmin) return helper.failed(res, "Sub-admin not found");

      const { name, email, password, phone, countryCode, adminRoleId, adminPermissions, status } = req.body;

      const updateData = {};

      if (name) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = phone;
      if (countryCode !== undefined) updateData.countryCode = countryCode;

      if (email && email.trim().toLowerCase() !== subAdmin.email) {
        const emailCheck = await users.findOne({
          where: {
            email: email.trim().toLowerCase(),
            id: { [Op.ne]: id }
          }
        });
        if (emailCheck) return helper.failed(res, "Email already in use by another account");
        updateData.email = email.trim().toLowerCase();
      }

      if (password && password.trim().length >= 6) {
        updateData.password = await bcrypt.hash(password.trim(), 10);
      }

      if (adminRoleId && parseInt(adminRoleId) !== subAdmin.adminRoleId) {
        const role = await admin_roles.findOne({ where: { id: adminRoleId } });
        if (!role) return helper.failed(res, "Selected role does not exist");
        updateData.adminRoleId = role.id;
        updateData.adminRoleSlug = role.slug;
      }

      if (adminPermissions !== undefined) {
        updateData.adminPermissions = Array.isArray(adminPermissions) ? adminPermissions : null;
      }

      if (status && ['active', 'blocked', 'inactive'].includes(status)) {
        updateData.status = status;
      }

      await subAdmin.update(updateData);
      return helper.success(res, "Sub-admin updated successfully");
    } catch (error) {
      console.error("updateSubAdmin error:", error);
      return helper.error(res, "Failed to update sub-admin");
    }
  },

  /**
   * Delete Sub-Admin
   */
  deleteSubAdmin: async (req, res) => {
    try {
      if (req.auth.isSubAdmin || (req.auth.adminRoleSlug && req.auth.adminRoleSlug !== 'super_admin')) {
        return helper.failed(res, "Only Super Admin has permission to delete sub-admins");
      }

      const { id } = req.params;

      if (parseInt(id) === req.auth.id) {
        return helper.failed(res, "You cannot delete your own account");
      }

      const subAdmin = await users.findOne({ where: { id, role: 'admin', deletedAt: null } });
      if (!subAdmin) return helper.failed(res, "Sub-admin not found");

      await subAdmin.update({ deletedAt: new Date(), status: 'inactive' });
      return helper.success(res, "Sub-admin removed successfully");
    } catch (error) {
      console.error("deleteSubAdmin error:", error);
      return helper.error(res, "Failed to delete sub-admin");
    }
  }
};
