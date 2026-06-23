require('dotenv').config();
const { users } = require("../../models");

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helper = require('../../helpers/helper')
const path = require('path');

module.exports = {



    login: async (req, res) => {
        const { email, password } = req.body;
        try {
            const admin = await users.findOne({ where: { email } });
            if (!admin) {
                return helper.failed(res, "Incorrect email or password");
            }
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return helper.failed(res, "Incorrect email or password");
            }
            if (admin.role != 'admin') {
                return helper.failed(res, "Incorrect email or password");
            }
            let time = Math.floor(Date.now() / 1000);
            await admin.update({ loginTime: time });
            const token = jwt.sign(
                {
                    data: {
                        id: admin.id,
                        name: admin.name,
                        login_time: time,
                    },
                },
                process.env.crypto_key,
            );
            return helper.success(res, "Login successfully", { token });
        } catch (error) {
            console.log(error, "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm")
            // return helper.failed(res, "Something went wrong");
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
            const payload = {
                ...row,
                profile_picture: row.profileImage || row.profile_picture,
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