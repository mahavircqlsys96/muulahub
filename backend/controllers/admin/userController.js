require('dotenv').config();
const { users, bookings, followers } = require('../../models');
const db = require("../../models");
const sequelize = db.sequelize;
const Sequelize = require("sequelize");
const { Op, fn, col } = Sequelize;
const helper = require('../../helpers/helper');
const path = require('path');

module.exports = {
    userList: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const offset = (page - 1) * limit;
            let role = req.query.role || 'user';
            if (role === 'individual') role = 'user';
            if (role === 'individuals') role = 'user';
            let whereClause = { role, deletedAt: null };

            if (search) {
                whereClause = {
                    [Op.and]: [
                        { role },
                        {
                            [Op.or]: [
                                { name: { [Op.like]: `%${search}%` } },
                                { email: { [Op.like]: `%${search}%` } },

                                Sequelize.where(
                                    Sequelize.fn(
                                        "CONCAT",
                                        Sequelize.col("name"),
                                        " ",

                                    ),
                                    { [Op.like]: `%${search}%` }
                                ),
                            ],
                        },
                    ],
                };
            }
            const { count, rows: user_list } = await users.findAndCountAll({
                where: whereClause,
                limit,
                offset,
                order: [['createdAt', 'DESC']],
            });
            const ids = user_list.map((u) => u.id);
            let bookingMap = {};
            if (ids.length && role === 'user') {
                const bc = await bookings.findAll({
                    attributes: ['userId', [fn('COUNT', col('id')), 'cnt']],
                    where: { userId: { [Op.in]: ids } },
                    group: ['userId'],
                    raw: true,
                });
                bookingMap = Object.fromEntries(bc.map((b) => [String(b.userId), parseInt(b.cnt, 10)]));
            }
            const user_list_json = user_list.map((u) => {
                const j = u.toJSON();
                if (role === 'user') j.total_bookings = bookingMap[String(u.id)] || 0;
                return j;
            });
            return helper.success(res, 'user list fetched', {
                user_list: user_list_json,
                total: count,
                currentPage: page,
                totalPages: Math.ceil(count / limit)
            });
        } catch (error) {
            console.log(error)
            return helper.failed(res, 'Something went wrong')
        }
    },


    userList2: async (req, res) => {
        try {
            const user_list = await users.findAll({
                where: {
                    role: "individual"
                },
                order: [['createdAt', 'DESC']],
            });
            return helper.success(res, 'user list fetched',
                user_list);
        } catch (error) {
            console.log(error)
            return helper.failed(res, 'Something went wrong')
        }
    },
    userListDeleted: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const offset = (page - 1) * limit;
            const role = 'user';
            let whereClause = {
                role,
                deletedAt: { [Op.ne]: null },
            };

            if (search) {
                whereClause = {
                    [Op.and]: [
                        { role, deletedAt: { [Op.ne]: null } },
                        {
                            [Op.or]: [
                                { name: { [Op.like]: `%${search}%` } },
                                { email: { [Op.like]: `%${search}%` } },

                                Sequelize.where(
                                    Sequelize.fn(
                                        "CONCAT",
                                        Sequelize.col("name"),
                                        " ",

                                    ),
                                    { [Op.like]: `%${search}%` }
                                ),
                            ],
                        },
                    ],
                };
            }
            const { count, rows: user_list } = await users.findAndCountAll({
                where: whereClause, paranoid: false,
                limit,
                offset,
                order: [['createdAt', 'DESC']],
            });

            return helper.success(res, 'user list fetched', {
                user_list,
                total: count,
                currentPage: page,
                totalPages: Math.ceil(count / limit)
            });
        } catch (error) {
            console.log(error)
            return helper.failed(res, 'Something went wrong')
        }
    },
    viewUser: async (req, res) => {

        const { id } = req.params;

        try {

            const user_details = await users.findOne({
                where: { id },
                include: [
                    { model: users, as: 'referrer', attributes: ['id', 'name', 'referralCode'] }
                ],
                paranoid: false,
            });

            if (!user_details) {
                return helper.failed(res, "User not found");
            }

            const totalSpentResult = await bookings.findOne({
                attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'totalSpent']],
                where: {
                    userId: id,
                    paymentStatus: 'paid'
                },
                raw: true
            });

            const row = user_details.toJSON ? user_details.toJSON() : user_details;
            row.total_spent = parseFloat(totalSpentResult?.totalSpent || 0);

            return helper.success(res, "user view", row);

        } catch (error) {
            console.log(error);
            return helper.failed(res, "Something went wrong");
        }
    },

    toggleUserStatus: async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        try {
            const user_exists = await users.findOne({ where: { id } });
            if (!user_exists) {
                return helper.failed(res, "Account not found")
            }
            
            const newStatus = status || (user_exists.status === 'active' ? 'inactive' : 'active');
            await user_exists.update({ status: newStatus });
            return helper.success(res, "User status updated successfully")
        } catch (error) {
            console.log(error)
            return helper.failed(res, 'Something went wrong')
        }
    },

    deleteUser: async (req, res) => {
        const { id } = req.params;

        const t = await sequelize.transaction();

        try {
            const user_exists = await users.findOne({
                where: { id },
                transaction: t,
            });

            if (!user_exists) {
                await t.rollback();
                return helper.failed(res, "Account not found");
            }

            await users.destroy({
                where: { id },
                transaction: t,
            });

            await t.commit();

            return helper.success(res, "Account deleted");

        } catch (error) {
            console.log(error);
            await t.rollback();
            return helper.failed(res, "Something went wrong");
        }
    },

    restoreUser: async (req, res) => {
        const { id } = req.params;

        try {

            console.log("Restore ID:", id);

            // find deleted user
            const user_exists = await users.findOne({
                where: { id },
                paranoid: false
            });

            console.log("User Found:", user_exists);

            if (!user_exists) {
                return helper.failed(res, "User not found");
            }

            if (!user_exists.deletedAt) {
                return helper.failed(res, "User is not deleted");
            }

            // restore user
            await users.restore({
                where: { id }
            });

            return helper.success(res, "User restored successfully");

        } catch (error) {

            console.log(error, "Restore Error");
            return helper.failed(res, "Something went wrong");

        }
    },
    updateApprovalStatus: async (req, res) => {
        const { account_status, id } = req.body;
        try {
            const user_exists = await users.findOne({ where: { id } });
            if (!user_exists) {
                return helper.failed(res, "Account not found")
            }


            const { account_status } = req.body;

            let updateData = { account_status };

            if (account_status === "disapproved") {
                updateData.status = "inactive";
            }

            if (account_status === "approved") {
                updateData.status = "active";
            }


            await user_exists.update(updateData);


            // await user_exists.update({ account_status });


            return helper.success(res, "status toggled")
        } catch (error) {
            console.log(error)
            return helper.failed(res, 'Something went wrong')
        }
    },
    generateUserQR: async (req, res) => {

        try {
            // Check if user exists
            const user = await users.findOne({ where: { id: req.body.user_id } });
            if (!user) {
                return helper.failed(res, "User not found");
            }

            // Generate new QR code (example: using some QR generator)
            // Replace this with your actual QR code generation logic

            // const qrData = `user_id:${req.body.user_id},`; // data to encode

            const timestamp = new Date().toISOString();          // QR data
            const qrData = JSON.stringify({
                user_id: req.body.user_id,
                time: timestamp
            });

            // Generate QR
            const qr_url = await QRCode.toDataURL(qrData);

            // const qr_url = await QRCode.toDataURL(qrData); // returns base64 image URL

            // Return QR without persisting (users table has no qr_code in ParkEZ schema)
            return helper.success(res, "QR code generated successfully", { qr_url });
        } catch (error) {
            console.log(error);
            return helper.failed(res, "Something went wrong");
        }
    },
    userVehiclesByUserId: async (req, res) => {
        try {
            return helper.success(res, "Vehicles list fetched", {
                vehicles_list: [],
                total: 0,
                currentPage: 1,
                totalPages: 0
            });
        } catch (error) {
            console.log(error);
            return helper.failed(res, "Something went wrong");
        }
    },

    userFollowers: async (req, res) => {
        try {
            const { id } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { count, rows } = await followers.findAndCountAll({
                where: { followingId: id },
                include: [{ model: users, as: 'follower', attributes: ['id', 'name', 'email', 'profileImage', 'phone'] }],
                limit,
                offset,
                order: [['createdAt', 'DESC']],
                distinct: true,
            });

            return helper.success(res, 'Followers fetched', {
                list: rows,
                total: count,
                currentPage: page,
                totalPages: Math.ceil(count / limit) || 1,
            });
        } catch (error) {
            console.log(error);
            return helper.failed(res, 'Something went wrong');
        }
    },

    userFollowing: async (req, res) => {
        try {
            const { id } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { count, rows } = await followers.findAndCountAll({
                where: { followerId: id },
                include: [{ model: users, as: 'following', attributes: ['id', 'name', 'email', 'profileImage', 'phone'] }],
                limit,
                offset,
                order: [['createdAt', 'DESC']],
                distinct: true,
            });

            return helper.success(res, 'Following fetched', {
                list: rows,
                total: count,
                currentPage: page,
                totalPages: Math.ceil(count / limit) || 1,
            });
        } catch (error) {
            console.log(error);
            return helper.failed(res, 'Something went wrong');
        }
    },
}