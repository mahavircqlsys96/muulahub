require('dotenv').config();
const db = require("../../models");
const { users, admin_roles } = db;

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helper = require('../../helpers/helper')
const path = require('path');

module.exports = {

    login: async (req, res) => {
        const { email, password, portalType } = req.body;
        try {
            const identifier = (email || '').trim();
            const admin = await users.findOne({
                where: {
                    [db.Sequelize.Op.or]: [
                        { email: identifier.toLowerCase() },
                        { userName: identifier }
                    ]
                }
            });
            if (!admin) {
                return helper.failed(res, "Incorrect email/username or password");
            }
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return helper.failed(res, "Incorrect email/username or password");
            }
            if (admin.role != 'admin') {
                return helper.failed(res, "Incorrect email/username or password");
            }
            if (admin.status === 'blocked' || admin.status === 'inactive') {
                return helper.failed(res, "Your account has been deactivated. Contact Super Admin.");
            }

            // Strict Portal Segregation
            const isSubAdminUser = !!admin.isSubAdmin;
            if (portalType === 'subadmin') {
                if (!isSubAdminUser) {
                    return res.status(401).json({
                        success: false,
                        code: 401,
                        message: "Unauthorized: Super Admin must log in from the Super Admin Panel (https://app.muulahub.com/).",
                        body: {}
                    });
                }
            } else {
                // Main Admin Portal (Super Admin only)
                if (isSubAdminUser) {
                    return res.status(401).json({
                        success: false,
                        code: 401,
                        message: "Unauthorized: Sub-Admins must log in from the Sub-Admin Panel (https://app.muulahub.com/subadmin).",
                        body: {}
                    });
                }
            }
            let time = Math.floor(Date.now() / 1000);
            await admin.update({ loginTime: time });

            let roleSlug = admin.adminRoleSlug || (isSubAdminUser ? 'sub_admin' : 'super_admin');
            let permissions = admin.adminPermissions;
            let roleName = isSubAdminUser ? "Sub-Admin" : "Super Admin";

            if (admin.adminRoleId && admin_roles) {
              const roleObj = await admin_roles.findOne({ where: { id: admin.adminRoleId } });
              if (roleObj) {
                roleSlug = roleObj.slug;
                roleName = roleObj.name;
                if (!permissions || (Array.isArray(permissions) && !permissions.length)) {
                  permissions = roleObj.permissions;
                }
              }
            }

            // Ensure permissions is properly parsed as an Array
            if (typeof permissions === 'string') {
              try { permissions = JSON.parse(permissions); } catch (e) { permissions = []; }
            }

            // Super Admin has wildcard full access; Sub-Admins have ONLY their granted permissions!
            if (!isSubAdminUser || roleSlug === 'super_admin') {
              permissions = ["*"];
              roleName = roleName || "Super Admin";
            } else {
              permissions = Array.isArray(permissions) ? permissions : [];
            }

            const token = jwt.sign(
                {
                    data: {
                        id: admin.id,
                        name: admin.name,
                        role: admin.role,
                        adminRoleSlug: roleSlug,
                        login_time: time,
                    },
                },
                process.env.crypto_key,
            );
            return helper.success(res, "Login successfully", {
                token,
                user: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    roleSlug,
                    roleName,
                    permissions: permissions,
                    isSubAdmin: isSubAdminUser
                }
            });
        } catch (error) {
            console.log(error, "login error")
            return helper.failed(res, "Something went wrong: " + error.message);
        }
    },

    adminProfile: async (req, res) => {
        const { id } = req.params;
        try {
            const admin = await users.findOne({ where: { id } });
            if (!admin) {
                return helper.failed(res, "Admin not found");
            }
            const row = admin.toJSON ? admin.toJSON() : admin;

            const isSubAdminUser = !!admin.isSubAdmin;
            let roleSlug = admin.adminRoleSlug || (isSubAdminUser ? 'sub_admin' : 'super_admin');
            let permissions = admin.adminPermissions;
            let roleName = isSubAdminUser ? "Sub-Admin" : "Super Admin";

            if (admin.adminRoleId && admin_roles) {
              const roleObj = await admin_roles.findOne({ where: { id: admin.adminRoleId } });
              if (roleObj) {
                roleSlug = roleObj.slug;
                roleName = roleObj.name;
                if (!permissions || (Array.isArray(permissions) && !permissions.length)) {
                  permissions = roleObj.permissions;
                }
              }
            }

            // Ensure permissions is properly parsed as an Array
            if (typeof permissions === 'string') {
              try { permissions = JSON.parse(permissions); } catch (e) { permissions = []; }
            }

            // Super Admin has wildcard full access; Sub-Admins have ONLY their granted permissions!
            if (!isSubAdminUser || roleSlug === 'super_admin') {
              permissions = ["*"];
              roleName = roleName || "Super Admin";
            } else {
              permissions = Array.isArray(permissions) ? permissions : [];
            }

            const payload = {
                ...row,
                profile_picture: row.profileImage || row.profile_picture,
                roleSlug,
                roleName,
                permissions: permissions,
                isSubAdmin: isSubAdminUser
            };
            return helper.success(res, "Admin profile retrieved successfully", payload);
        } catch (err) {
            console.log(err)
            return helper.failed(res, "Something went wrong");
        }
    },

    updateProfile: async (req, res) => {
        const { id } = req.auth;
        const { name, email, country_code, phone, admin_commission, govt_tax, contact_email, contact_phone, withdrawal_fees, country_fees, promotional_fee_waivers, supported_currencies, tax_rules, payout_providers } = req.body;
        const imageFile = req.files ? req.files.profile_picture : undefined;
        try {
            const admin = await users.findOne({ where: { id } });
            if (!admin) {
                return helper.failed(res, "Admin not found");
            }

            const oldImageName = admin.profileImage;

            const updatedData = {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
                ...(country_code !== undefined && { country_code }),
                ...(phone !== undefined && { phone }),
                ...(admin_commission !== undefined && { admin_commission }),
                ...(govt_tax !== undefined && { govt_tax }),
                ...(contact_email !== undefined && { contact_email }),
                ...(contact_phone !== undefined && { contact_phone }),
                ...(withdrawal_fees !== undefined && { withdrawal_fees }),
                ...(country_fees !== undefined && { country_fees }),
                ...(promotional_fee_waivers !== undefined && { promotional_fee_waivers }),
                ...(supported_currencies !== undefined && { supported_currencies }),
                ...(tax_rules !== undefined && { tax_rules }),
                ...(payout_providers !== undefined && { payout_providers })
            };

            if (imageFile) {
                const folderName = "users"
                const fileUploader = await helper.fileUpload(imageFile, folderName);
                updatedData.profileImage = fileUploader;
            } else {
                updatedData.profileImage = admin.profileImage;
            }
            await users.update(updatedData, { where: { id } });

            if (oldImageName && imageFile) {
                const oldImagePath = path.join(
                    __dirname,
                    "../../public",
                    oldImageName
                );

                helper.deleteFileIfExists(oldImagePath);
            }
            return helper.success(res, "Admin profile updated");
        } catch (err) {
            console.log(err)
            return helper.failed(res, "Something went wrong");

        }
    },

    forgotPassword: async (req, res) => {
        const { email } = req.body;
        try {
            const admin = await users.findOne({ where: { email, role: "admin" } });
            if (!admin) {
                return helper.success(res, "If this email is registered, a reset link will be sent.", {});
            }
            const crypto = require("crypto");
            const token = crypto.randomBytes(32).toString("hex");
            const expiry = new Date(Date.now() + 60 * 60 * 1000);
            await admin.update({ reset_token: token, reset_token_expiry: expiry });
            const base = process.env.ADMIN_APP_URL || process.env.BASE_URL || "http://localhost:5173";
            const resetLink = `${base.replace(/\/$/, "")}/reset-password?token=${token}`;
            try {
                await helper.sendEmail(
                    email,
                    "ParkEZ Admin — Reset your password",
                    `<p>Click to reset your password (valid 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p>`
                );
            } catch (e) {
                console.log(e);
                return helper.failed(res, "Could not send email. Check SMTP settings.");
            }
            return helper.success(res, "If this email is registered, a reset link will be sent.", {});
        } catch (err) {
            console.log(err);
            return helper.failed(res, "Something went wrong");
        }
    },

    resetPassword: async (req, res) => {
        const { token, newPassword } = req.body;
        const { Op } = require("sequelize");
        try {
            if (!token || !newPassword) {
                return helper.failed(res, "Token and new password are required");
            }
            const admin = await users.findOne({
                where: {
                    reset_token: token,
                    reset_token_expiry: { [Op.gt]: new Date() },
                    role: "admin",
                },
            });
            if (!admin) {
                return helper.failed(res, "Invalid or expired reset link");
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await admin.update({
                password: hashedPassword,
                reset_token: null,
                reset_token_expiry: null,
            });
            return helper.success(res, "Password has been reset. You can log in now.");
        } catch (err) {
            console.log(err);
            return helper.failed(res, "Something went wrong");
        }
    },

    updatePassword: async (req, res) => {
        const { id } = req.auth;
        const { oldPassword, newPassword } = req.body;
        try {
            const admin = await users.findOne({ where: { id } });
            if (!admin) {
                return res.status(404).json({ message: "Admin not found" });
            }
            const isValidPassword = await bcrypt.compare(oldPassword, admin.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: "Incorrect current password" });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await users.update({ password: hashedPassword }, { where: { id } });
            return helper.success(res, "Admin password updated");
        } catch (err) {
            console.log(err)
            return helper.failed(res, "Something went wrong");

        }
    },
}