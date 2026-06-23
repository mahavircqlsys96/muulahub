
const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const { users, rooms, chats, reports, block_users, deleted_chats } = require("../models");
const helper = require("../helpers/helper");
const Sequelize = require('sequelize');
const middleware = require('../middleware/authMiddleware');
const envfile = process.env;
//  >>>>>>>>>>>>>>>>>>>   Audios /Viedos Call All Datials  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
// const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole, } = require("agora-token");

// const appID = envfile.APP_ID
// const appCertificate = envfile.APP_CERTIFICATE

// async function generateRandomString(length) {
//   var characters =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   var result = "";
//   var charactersLength = characters.length;

//   for (var i = 0; i < length; i++) {
//     var randomIndex = Math.floor(Math.random() * charactersLength);
//     result += characters.charAt(randomIndex);
//   }

//   return result;
// }

//  >>>>>>>>>>>>>>>>>>>   Audios /Viedos Call All Datials  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //

module.exports = function (io) {

  io.on('connection', function (socket) {
    socket.on('connectUser', async (data) => {
      try {
        const isValidToken = await middleware.authenticateToken(data.token);

        if (!isValidToken.success) {
          socket.emit("connectUser", {
            code: 401,
            message: "Session Expired",
          });
          return;
        }

        let userId = isValidToken.user.id;
        let socketId = socket.id;

        let check_user = await users.findOne({
          where: {
            id: userId,
          }
        });

        if (check_user) {
          await users.update({
            isOnline: "online",
            socketId,
          }, {
            where: {
              id: userId,
            }
          });
          socket.emit('connectUser', {
            code: 200,
            message: 'User connected successfully',
            body: {}
          });
        } else {
          socket.emit("connectUser", {
            code: 404,
            message: "User not found",
            body: {}
          });
        }

      } catch (error) {
        // Catch and emit internal server error status code 500
        socket.emit("connectUser", {
          code: 500,
          message: "Internal Server Error",
        });
        console.error(error);
      }
    });

    socket.on('disconnect', async (reason) => {
      try {
        const socketId = socket.id;

        let updatedata = await users.update(
          { isOnline: "offline" },
          {
            where: {
              socketId,
            },
          }
        );
        console.log(`User offline, socketId: ${socketId}, reason: ${reason}`)

      } catch (error) {
        console.error('Error during disconnection:', error);
      }
    });


    socket.on('sendMessage', async (get_data) => {
      try {
        const isValidToken = await middleware.authenticateToken(get_data.token);

        if (!isValidToken.success) {
          socket.emit("send_message", {
            code: 401,
            body: "Session Expired",
          });
          return;
        }

        const senderId = isValidToken.user.id;

        const findConstant = await rooms.findOne({
          where: {
            [Op.or]: [
              { senderId: senderId, receiverId: get_data.receiverId },
              { senderId: get_data.receiverId, receiverId: senderId }
            ]
          },
          raw: true
        });

        let createMessage;

        if (findConstant) {

          createMessage = await chats.create({
            senderId: senderId,
            roomId: findConstant.id,
            bookingId: get_data.bookingId,
            receiverId: get_data.receiverId,
            message: get_data.message,
            messageType: get_data.messageType,
          });

          await rooms.update(
            { lastMsgId: createMessage.id },
            { where: { id: findConstant.id } }
          );

        } else {

          const createConstant = await rooms.create({
            senderId: senderId,
            receiverId: get_data.receiverId
          });


          createMessage = await chats.create({
            senderId: senderId,
            receiverId: get_data.receiverId,
            roomId: createConstant.id,
            message: get_data.message,
            messageType: get_data.messageType,
          });

          await rooms.update(
            { lastMsgId: createMessage.id },
            { where: { id: createConstant.id } }
          );
        }


        const senderName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = sender_user_id)`), 'senderName'];
        const senderImage = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = sender_user_id)`), 'senderImage'];
        const receiverName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = receiver_user_id)`), 'receiverName'];
        const receiverImage = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = receiver_user_id)`), 'receiverImage'];

        const isBlockedByOther = await block_users.findOne({
          where: {
            blockBy: get_data.receiverId,
            blockTo: senderId
          }
        });


        const message = await chats.findOne({
          attributes: {
            include: [[Sequelize.literal(`CASE WHEN chats.receiverId = ${get_data.receiverId} THEN chats.senderId ELSE chats.receiverId END`), 'sender_user_id'],
            [Sequelize.literal(`CASE WHEN chats.senderId = ${senderId} THEN chats.receiverId ELSE chats.senderId END`), 'receiver_user_id'],
              senderName,
              senderImage,
              receiverName,
              receiverImage
            ]
          },
          where: { id: createMessage.id }
        });
        if (isBlockedByOther) {
          await deleted_chats.create({
            chatId: createMessage.id,          // ✅ IMPORTANT
            deletedBy: get_data.receiverId    // deleted for receiver
          });

          // ✅ Send only to sender
          socket.emit('send_message', {
            success_message: 'Message sent successfully',
            code: 200,
            body: message
          });

          return; // ❌ STOP HERE (do not send to receiver)
        }



        const successMessage = {
          success_message: 'Message sent successfully',
          code: 200,
          body: message
        };



        const findSender = await users.findOne({
          where: { id: senderId },
          raw: true
        });
        const findReceiver = await users.findOne({
          where: { id: get_data.receiverId },
          raw: true
        });
        // Send push notification if enabled
        if (findReceiver && findReceiver.isNotification == "on") {
          const ndata = {
            msg: "New Message",
            title: "werral",
            message: "You received a new message",
            bookingId: get_data.bookingId,
            msg_type: get_data.messageType,
            senderId: senderId,
            sender_name: findSender.name,
            sender_image: findSender.profileImage,
            type: 6
          };

          console.log("Push sent successfully");

          // 1 => iOS, 2 => Android

          helper.sendNotification(findReceiver.fcmToken, ndata);

        } else {
          console.log("Notification turned off");
        }
        /* ------------------ WHERE CONDITION ------------------ */

        socket.emit('send_message', successMessage);

        io.to(findReceiver.socketId).emit('send_message', successMessage);
        io.to(findReceiver.socketId).emit('message_alert', successMessage);

      } catch (error) {
        console.log(error);
      }
    });

    socket.on('inbox', async (get_data) => {
      try {

        const isValidToken = await middleware.authenticateToken(get_data.token);

        if (!isValidToken.success) {
          socket.emit("inbox", {
            code: 401,
            body: "Session Expired",
          });
          return;
        }

        const senderId = isValidToken.user.id;

        // pagination
        const page = parseInt(get_data.page) || 1;
        const limit = parseInt(get_data.limit) || 10;
        const offset = (page - 1) * limit;

        const lastMsgId = [Sequelize.literal(`(SELECT message FROM chats WHERE chats.id = rooms.lastMsgId)`), "lastMsgId"];
        const receiverUserIdLiteral = `CASE WHEN rooms.receiverId = ${senderId} THEN rooms.senderId ELSE rooms.receiverId END`;
        const receiverName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = ${receiverUserIdLiteral})`), 'receiverName'];
        const imgquery = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = ${receiverUserIdLiteral})`), 'receiverImage'];
        const unread_msg = [Sequelize.literal(`(SELECT COUNT(*) FROM chats WHERE chats.receiverId = ${receiverUserIdLiteral} AND chats.isRead = '0')`), 'unread_msg'];
        const lastMsgTime = [Sequelize.literal(`(SELECT createdAt FROM chats WHERE chats.receiverId = ${receiverUserIdLiteral} ORDER BY id DESC  LIMIT 1)`), 'createdAt_time'];

        /* ------------------ MAIN QUERY ------------------ */
        const { count, rows } = await rooms.findAndCountAll({
          attributes: {
            include: [lastMsgTime, unread_msg, lastMsgId, receiverName, imgquery]
          },
          where: {
            [Op.or]: [{ senderId: senderId }, { receiverId: senderId }
            ]
          },
          order: [[Sequelize.literal('createdAt_time'), 'DESC']],
          limit,
          offset,
          raw: true
        });

        const success_message = {
          success_message: 'Chat inbox listing get successfully',
          code: 200,
          pagination: {
            total: count,
            total_pages: Math.ceil(count / limit),
            current_page: page,
            limit: limit
          },
          body: rows
        };

        socket.emit('inbox', success_message);

      } catch (error) {
        console.error(error);
        socket.emit('inbox', {
          code: 500,
          message: "Internal Server Error"
        });
      }
    });


    // socket.on('chat_list', async (get_data) => {
    //   try {
    //     const isValidToken = await middleware.authenticateToken(get_data.token);

    //     if (!isValidToken.success) {
    //       socket.emit("chat_list", {
    //         code: 401,
    //         body: "Session Expired",
    //       });
    //       return;
    //     }

    //     const senderId = isValidToken.user.id;

    //     /* ------------------ Pagination ------------------ */
    //     const page = parseInt(get_data.page) || 1;
    //     const limit = parseInt(get_data.limit) || 20;
    //     const offset = (page - 1) * limit;

    //     /* ------------------ Sub Queries ------------------ */
    //     const senderName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = sender_user_id)`), 'senderName'];
    //     const senderImage = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = sender_user_id)`), 'senderImage'];
    //     const receiverName = [Sequelize.literal(`(SELECT name FROM users WHERE users.id = receiver_user_id)`), 'receiverName'];
    //     const receiverImage = [Sequelize.literal(`(SELECT profileImage FROM users WHERE users.id = receiver_user_id)`), 'receiverImage'];

    //     /* ------------------ WHERE CONDITION ------------------ */
    //     const whereCondition = {
    //       [Op.and]: [
    //         {
    //           [Op.or]: [
    //             {
    //               senderId: senderId,
    //               receiverId: get_data.receiverId,
    //               bookingId: get_data.bookingId,
    //             },
    //             {
    //               senderId: get_data.receiverId,
    //               receiverId: senderId,
    //               bookingId: get_data.bookingId,
    //             }
    //           ]
    //         },

    //         // ❌ Exclude deleted messages for this user
    //         '' Sequelize.literal(`NOT EXISTS (SELECT 1 FROM deleted_chats WHERE deleted_chats.chatId = chats.id AND deleted_chats.deletedBy = ${senderId})`)]''
    //     };

    //     /* ------------------ COUNT (for pagination) ------------------ */
    //     const totalMessages = await chats.count({
    //       where: whereCondition
    //     });

    //     /* ------------------ FETCH MESSAGES ------------------ */
    //     const allMsg = await chats.findAll({
    //       where: whereCondition,
    //       order: [['id', 'DESC']], // latest first
    //       limit,
    //       offset,
    //       attributes: {
    //         include: [[Sequelize.literal(`CASE WHEN chats.receiverId = ${get_data.receiverId} THEN chats.senderId ELSE chats.receiverId END`), 'sender_user_id'],
    //         [Sequelize.literal(`CASE WHEN chats.senderId = ${senderId} THEN chats.receiverId ELSE chats.senderId END`), 'receiver_user_id'],
    //           senderName,
    //           senderImage,
    //           receiverName,
    //           receiverImage
    //         ]
    //       }
    //     });

    //     const isBlockedByMe = await block_users.findOne({
    //       where: {
    //         blockBy: senderId,
    //         blockTo: get_data.receiverId
    //       }
    //     });
    //     const isBlockedByOther = await block_users.findOne({
    //       where: {
    //         blockTo: senderId,
    //         blockBy: get_data.receiverId
    //       }
    //     });
    //     const blockByMe = isBlockedByMe ? 1 : 0;
    //     const blockByOther = isBlockedByOther ? 1 : 0;

    //     /* ------------------ RESPONSE ------------------ */
    //     socket.emit('chat_list', {
    //       success_message: 'Messages Listing',
    //       code: 200,
    //       pagination: {
    //         total: totalMessages,
    //         page,
    //         limit,
    //         total_pages: Math.ceil(totalMessages / limit),
    //         blockByMe: blockByMe,
    //         blockByOther: blockByOther
    //       },
    //       body: allMsg
    //     });

    //   } catch (error) {
    //     console.log(error);
    //     socket.emit('chat_list', {
    //       code: 500,
    //       message: 'Something went wrong'
    //     });
    //   }
    // });

    // socket.on('reportss', async (data) => {
    //   try {

    //     const isValidToken = await middleware.authenticateToken(data.token);

    //     if (!isValidToken.success) {
    //       socket.emit("chat_list", {
    //         code: 401,
    //         body: "Session Expired",
    //       });
    //       return;
    //     }

    //     const senderId = isValidToken.user.id;

    //     const reportAdd = await reports.create({
    //       reportBy: senderId,
    //       referenceId: data.referenceId,
    //       bookingId: data.bookingId,
    //       reason: data.message, reportType: 'user'
    //     });

    //     const successMessage = {
    //       success_message: "Report user successfully, admin will take action in 24 hours.",
    //     };
    //     socket.emit("reportss", successMessage);

    //   } catch (error) {
    //     console.error(error);
    //     socket.emit("reportss", { error_message: "Failed to report  user" });
    //   }
    // });



    // //////////////////////////

    // socket.on('read_msg', async (data) => {
    //   try {
    //     const isValidToken = await middleware.authenticateToken(data.token);

    //     if (!isValidToken.success) {
    //       socket.emit("chat_list", {
    //         code: 401,
    //         body: "Session Expired",
    //       });
    //       return;
    //     }

    //     const senderId = isValidToken.user.id;

    //     let update_read_status = await chats.update({
    //       isRead: 1
    //     }, {
    //       where: {
    //         senderId: data.receiverId,
    //         receiverId: senderId,

    //       }
    //     })

    //     success_message = {
    //       success_message: "message read successfully",
    //     };
    //     socket.emit("read_msg", success_message);
    //   } catch (error) {
    //     console.log(error, "Kerorroororoor");
    //   }

    // });

    // socket.on('blocked_users', async (data) => {
    //   try {
    //     const isValidToken = await middleware.authenticateToken(data.token);

    //     if (!isValidToken.success) {
    //       socket.emit("chat_list", {
    //         code: 401,
    //         body: "Session Expired",
    //       });
    //       return;
    //     }

    //     const blockBy = isValidToken.user.id;

    //     const { blockTo, status } = data;
    //     let msg = '';
    //     let data1 = {};

    //     if (blockTo === blockBy) {
    //       msg = "Cannot block yourself";
    //       socket.emit("blocked_users", { success_message: { msg } });
    //       return;
    //     }

    //     const userToBlock = await users.findByPk(blockTo);

    //     if (!userToBlock) {

    //       msg = "User to be blocked does not exist";
    //       socket.emit("blocked_users", { success_message: { msg } });
    //       return;
    //     }

    //     const existingBlock = await block_users.findOne({ where: { blockTo, blockBy } });

    //     if (status == 1) {  // Block user
    //       if (existingBlock) {
    //         msg = "User is already blocked";
    //         data1 = { blockByMe: 1, blockByOther: 0 };
    //       } else {
    //         await block_users.create({ blockTo, blockBy });
    //         msg = "User blocked successfully";
    //         data1 = { blockByMe: 1, blockByOther: 0 };
    //       }
    //     } else if (status == 0) {  // Unblock user
    //       if (existingBlock) {
    //         await block_users.destroy({ where: { blockTo, blockBy } });
    //         msg = "User unblocked successfully";
    //         data1 = { blockByMe: 0, blockByOther: 0 };
    //       } else {
    //         msg = "User is not blocked";
    //         data1 = { blockByMe: 0, blockByOther: 0 };
    //       }
    //     } else {
    //       msg = "Invalid status value";
    //       socket.emit("blocked_users", { success_message: { msg } });
    //       return;
    //     }

    //     const socketUser = await users.findOne({ where: { id: blockTo }, raw: true });


    //     if (socketUser) {
    //       const notificationData = status == 1 ? { blockByMe: 0, blockByOther: 1 } : { blockByMe: 0, blockByOther: 0 };

    //       io.to(socketUser.socketId).emit('blocked_users', { success_message: { msg, data1: notificationData } });
    //     }

    //     // Notify the blocking/unblocking user
    //     socket.emit("blocked_users", { success_message: { msg, data1 } });

    //   } catch (error) {
    //     console.error(error);
    //     socket.emit('blocked_users_error', { error: error.message || "An error occurred while processing the request." });
    //   }
    // });
    // socket.on('clear_chat', async (get_data) => {
    //   try {
    //     const isValidToken = await middleware.authenticateToken(get_data.token);

    //     if (!isValidToken.success) {
    //       socket.emit("clear_chat", {
    //         code: 401,
    //         message: "Session Expired"
    //       });
    //       return;
    //     }

    //     const user_id = isValidToken.user.id;

    //     /* ------------------ FIND ROOM ------------------ */
    //     const room = await rooms.findOne({
    //       where: {
    //         id: get_data.roomId
    //         // [Op.or]: [
    //         //   {
    //         //     senderId: user_id,
    //         //     receiverId: get_data.receiverId,
    //         //     bookingId: get_data.bookingId
    //         //   },
    //         //   {
    //         //     senderId: get_data.receiverId,
    //         //     receiverId: user_id,
    //         //     bookingId: get_data.bookingId
    //         //   }
    //         // ]
    //       }
    //     });

    //     if (!room) {
    //       socket.emit('clear_chat', {
    //         code: 404,
    //         message: "Chat room not found"
    //       });
    //       return;
    //     }

    //     /* ------------------ GET ONLY NON-DELETED MESSAGES ------------------ */
    //     const chatIds = await chats.findAll({
    //       where: {
    //         roomId: room.id,
    //         [Op.and]: [
    //           Sequelize.literal(`
    //             NOT EXISTS (
    //               SELECT 1 
    //               FROM deleted_chats 
    //               WHERE deleted_chats.chatId = chats.id
    //               AND deleted_chats.deletedBy = ${user_id}
    //             )
    //           `)
    //         ]
    //       },
    //       attributes: ['id'],
    //       raw: true
    //     });

    //     if (!chatIds.length) {
    //       socket.emit('clear_chat', {
    //         code: 200,
    //         message: "Chat already cleared"
    //       });
    //       return;
    //     }

    //     /* ------------------ PREPARE BULK DELETE ------------------ */
    //     const deleteData = chatIds.map(item => ({
    //       chatId: item.id,
    //       deletedBy: user_id
    //     }));

    //     /* ------------------ INSERT ------------------ */
    //     await deleted_chats.bulkCreate(deleteData);

    //     /* ------------------ RESPONSE ------------------ */
    //     socket.emit('clear_chat', {
    //       code: 200,
    //       message: "Chat cleared successfully"
    //     });

    //   } catch (error) {
    //     console.error(error);
    //     socket.emit('clear_chat', {
    //       code: 500,
    //       message: "Something went wrong"
    //     });
    //   }
    // });


    // socket.on('message_alert', async (data) => {
    //   try {
    //     let socketUser = await users.findOne({ where: { id: data.receiverId } });

    //     const successMessage = {
    //       success_message: "message sent successfully",
    //     };

    //     if (socketUser) {
    //       io.to(socketUser.socketId).emit('message_alert', successMessage);
    //     }
    //   } catch (error) {
    //     console.error(error);
    //     throw error;
    //   }
    // });


  });


};
